#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, token,
    Address, BytesN, Env,
};

#[contract]
pub struct CampaignEscrow;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CampaignStatus {
    Created,
    Funded,
    Active,
    Paused,
    Finalized,
    Settled,
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Campaign {
    pub campaign_id: BytesN<32>,
    pub protocol_owner: Address,
    pub admin: Address,
    pub reward_asset: Address,
    pub start_time: u64,
    pub end_time: u64,
    pub status: CampaignStatus,
    pub allocation_hash: Option<BytesN<32>>,
    pub allocation_total: i128,
    pub participant_count: u32,
    pub total_funded: i128,
    pub total_distributed: i128,
    pub total_refunded: i128,
}

#[contracttype]
enum DataKey {
    Campaign,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum EscrowError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InvalidTimeRange = 4,
    Unauthorized = 5,
    InvalidStatus = 6,
    CampaignNotStarted = 7,
    CampaignExpired = 8,
    EmptyRewardPool = 9,
    NoParticipants = 10,
    AllocationExceedsPool = 11,
    NothingToRefund = 12,
}

#[contractevent(topics = ["campaign", "initialized"])]
pub struct CampaignInitialized {
    #[topic]
    pub campaign_id: BytesN<32>,
    #[topic]
    pub protocol_owner: Address,
    pub admin: Address,
    pub reward_asset: Address,
    pub start_time: u64,
    pub end_time: u64,
}

#[contractevent(topics = ["campaign", "funded"])]
pub struct CampaignFunded {
    #[topic]
    pub campaign_id: BytesN<32>,
    #[topic]
    pub funder: Address,
    pub amount: i128,
    pub total_funded: i128,
}

#[contractevent(topics = ["campaign", "activated"])]
pub struct CampaignActivated {
    #[topic]
    pub campaign_id: BytesN<32>,
    pub activated_at: u64,
}

#[contractevent(topics = ["campaign", "paused"])]
pub struct CampaignPaused {
    #[topic]
    pub campaign_id: BytesN<32>,
    #[topic]
    pub caller: Address,
}

#[contractevent(topics = ["campaign", "resumed"])]
pub struct CampaignResumed {
    #[topic]
    pub campaign_id: BytesN<32>,
    #[topic]
    pub caller: Address,
}

#[contractevent(topics = ["campaign", "finalized"])]
pub struct CampaignFinalized {
    #[topic]
    pub campaign_id: BytesN<32>,
    pub allocation_hash: BytesN<32>,
    pub allocation_total: i128,
    pub participant_count: u32,
}

#[contractevent(topics = ["campaign", "settled"])]
pub struct CampaignSettled {
    #[topic]
    pub campaign_id: BytesN<32>,
    #[topic]
    pub distributor: Address,
    pub distributed_amount: i128,
    pub refunded_remainder: i128,
}

#[contractevent(topics = ["campaign", "refunded"])]
pub struct CampaignRefunded {
    #[topic]
    pub campaign_id: BytesN<32>,
    #[topic]
    pub protocol_owner: Address,
    pub amount: i128,
}

#[contractimpl]
impl CampaignEscrow {
    pub fn initialize_campaign(
        env: Env,
        campaign_id: BytesN<32>,
        protocol_owner: Address,
        admin: Address,
        reward_asset: Address,
        start_time: u64,
        end_time: u64,
    ) {
        if env.storage().instance().has(&DataKey::Campaign) {
            panic_with_error!(&env, EscrowError::AlreadyInitialized);
        }
        if end_time <= start_time {
            panic_with_error!(&env, EscrowError::InvalidTimeRange);
        }

        protocol_owner.require_auth();
        let campaign = Campaign {
            campaign_id: campaign_id.clone(),
            protocol_owner: protocol_owner.clone(),
            admin: admin.clone(),
            reward_asset: reward_asset.clone(),
            start_time,
            end_time,
            status: CampaignStatus::Created,
            allocation_hash: None,
            allocation_total: 0,
            participant_count: 0,
            total_funded: 0,
            total_distributed: 0,
            total_refunded: 0,
        };
        write_campaign(&env, &campaign);

        CampaignInitialized {
            campaign_id,
            protocol_owner,
            admin,
            reward_asset,
            start_time,
            end_time,
        }
        .publish(&env);
    }

    pub fn fund_campaign(env: Env, from: Address, amount: i128) {
        require_positive_amount(&env, amount);
        let mut campaign = read_campaign(&env);
        if from != campaign.protocol_owner {
            panic_with_error!(&env, EscrowError::Unauthorized);
        }
        if campaign.status != CampaignStatus::Created && campaign.status != CampaignStatus::Funded {
            panic_with_error!(&env, EscrowError::InvalidStatus);
        }

        from.require_auth();
        token::Client::new(&env, &campaign.reward_asset).transfer(
            &from,
            &env.current_contract_address(),
            &amount,
        );
        campaign.total_funded += amount;
        campaign.status = CampaignStatus::Funded;
        write_campaign(&env, &campaign);

        CampaignFunded {
            campaign_id: campaign.campaign_id,
            funder: from,
            amount,
            total_funded: campaign.total_funded,
        }
        .publish(&env);
    }

    pub fn activate_campaign(env: Env, caller: Address) {
        let mut campaign = read_campaign(&env);
        require_owner_or_admin(&env, &campaign, &caller);
        if campaign.status != CampaignStatus::Funded {
            panic_with_error!(&env, EscrowError::InvalidStatus);
        }
        if campaign.total_funded <= 0 {
            panic_with_error!(&env, EscrowError::EmptyRewardPool);
        }

        let now = env.ledger().timestamp();
        if now < campaign.start_time {
            panic_with_error!(&env, EscrowError::CampaignNotStarted);
        }
        if now > campaign.end_time {
            panic_with_error!(&env, EscrowError::CampaignExpired);
        }

        caller.require_auth();
        campaign.status = CampaignStatus::Active;
        write_campaign(&env, &campaign);
        CampaignActivated {
            campaign_id: campaign.campaign_id,
            activated_at: now,
        }
        .publish(&env);
    }

    pub fn pause_campaign(env: Env, caller: Address) {
        let mut campaign = read_campaign(&env);
        require_owner_or_admin(&env, &campaign, &caller);
        require_status(&env, &campaign, CampaignStatus::Active);
        caller.require_auth();
        campaign.status = CampaignStatus::Paused;
        write_campaign(&env, &campaign);
        CampaignPaused {
            campaign_id: campaign.campaign_id,
            caller,
        }
        .publish(&env);
    }

    pub fn resume_campaign(env: Env, caller: Address) {
        let mut campaign = read_campaign(&env);
        require_owner_or_admin(&env, &campaign, &caller);
        require_status(&env, &campaign, CampaignStatus::Paused);
        if env.ledger().timestamp() > campaign.end_time {
            panic_with_error!(&env, EscrowError::CampaignExpired);
        }

        caller.require_auth();
        campaign.status = CampaignStatus::Active;
        write_campaign(&env, &campaign);
        CampaignResumed {
            campaign_id: campaign.campaign_id,
            caller,
        }
        .publish(&env);
    }

    pub fn finalize_campaign(
        env: Env,
        caller: Address,
        allocation_hash: BytesN<32>,
        allocation_total: i128,
        participant_count: u32,
    ) {
        require_positive_amount(&env, allocation_total);
        let mut campaign = read_campaign(&env);
        if caller != campaign.admin {
            panic_with_error!(&env, EscrowError::Unauthorized);
        }
        require_status(&env, &campaign, CampaignStatus::Active);
        if env.ledger().timestamp() <= campaign.end_time {
            panic_with_error!(&env, EscrowError::CampaignNotStarted);
        }
        if participant_count == 0 {
            panic_with_error!(&env, EscrowError::NoParticipants);
        }
        if allocation_total > available_balance(&campaign) {
            panic_with_error!(&env, EscrowError::AllocationExceedsPool);
        }

        caller.require_auth();
        campaign.status = CampaignStatus::Finalized;
        campaign.allocation_hash = Some(allocation_hash.clone());
        campaign.allocation_total = allocation_total;
        campaign.participant_count = participant_count;
        write_campaign(&env, &campaign);

        CampaignFinalized {
            campaign_id: campaign.campaign_id,
            allocation_hash,
            allocation_total,
            participant_count,
        }
        .publish(&env);
    }

    pub fn settle_campaign(env: Env, caller: Address, distributor: Address) {
        let mut campaign = read_campaign(&env);
        if caller != campaign.admin {
            panic_with_error!(&env, EscrowError::Unauthorized);
        }
        require_status(&env, &campaign, CampaignStatus::Finalized);
        caller.require_auth();

        let allocation_total = campaign.allocation_total;
        let remainder = available_balance(&campaign) - allocation_total;
        let token_client = token::Client::new(&env, &campaign.reward_asset);
        token_client.transfer(
            &env.current_contract_address(),
            &distributor,
            &allocation_total,
        );
        if remainder > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &campaign.protocol_owner,
                &remainder,
            );
        }

        campaign.total_distributed += allocation_total;
        campaign.total_refunded += remainder;
        campaign.status = CampaignStatus::Settled;
        write_campaign(&env, &campaign);
        CampaignSettled {
            campaign_id: campaign.campaign_id,
            distributor,
            distributed_amount: allocation_total,
            refunded_remainder: remainder,
        }
        .publish(&env);
    }

    pub fn refund_campaign(env: Env, caller: Address) {
        let mut campaign = read_campaign(&env);
        require_owner_or_admin(&env, &campaign, &caller);
        require_status(&env, &campaign, CampaignStatus::Paused);
        let amount = available_balance(&campaign);
        if amount <= 0 {
            panic_with_error!(&env, EscrowError::NothingToRefund);
        }

        caller.require_auth();
        token::Client::new(&env, &campaign.reward_asset).transfer(
            &env.current_contract_address(),
            &campaign.protocol_owner,
            &amount,
        );
        campaign.total_refunded += amount;
        campaign.status = CampaignStatus::Refunded;
        write_campaign(&env, &campaign);
        CampaignRefunded {
            campaign_id: campaign.campaign_id,
            protocol_owner: campaign.protocol_owner,
            amount,
        }
        .publish(&env);
    }

    pub fn campaign_status(env: Env) -> CampaignStatus {
        read_campaign(&env).status
    }

    pub fn reward_balance(env: Env) -> i128 {
        available_balance(&read_campaign(&env))
    }

    pub fn campaign(env: Env) -> Campaign {
        read_campaign(&env)
    }
}

fn read_campaign(env: &Env) -> Campaign {
    env.storage()
        .instance()
        .get(&DataKey::Campaign)
        .unwrap_or_else(|| panic_with_error!(env, EscrowError::NotInitialized))
}

fn write_campaign(env: &Env, campaign: &Campaign) {
    env.storage().instance().set(&DataKey::Campaign, campaign);
}

fn require_positive_amount(env: &Env, amount: i128) {
    if amount <= 0 {
        panic_with_error!(env, EscrowError::InvalidAmount);
    }
}

fn require_status(env: &Env, campaign: &Campaign, expected: CampaignStatus) {
    if campaign.status != expected {
        panic_with_error!(env, EscrowError::InvalidStatus);
    }
}

fn require_owner_or_admin(env: &Env, campaign: &Campaign, caller: &Address) {
    if caller != &campaign.protocol_owner && caller != &campaign.admin {
        panic_with_error!(env, EscrowError::Unauthorized);
    }
}

fn available_balance(campaign: &Campaign) -> i128 {
    campaign.total_funded - campaign.total_distributed - campaign.total_refunded
}

#[cfg(test)]
mod test {
    extern crate std;

    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger as _},
        token::{StellarAssetClient, TokenClient},
        Env,
    };

    const START: u64 = 100;
    const END: u64 = 200;

    struct Fixture {
        env: Env,
        owner: Address,
        admin: Address,
        outsider: Address,
        distributor: Address,
        token_id: Address,
        escrow_id: Address,
    }

    impl Fixture {
        fn new() -> Self {
            let env = Env::default();
            env.mock_all_auths();
            let owner = Address::generate(&env);
            let admin = Address::generate(&env);
            let outsider = Address::generate(&env);
            let distributor = Address::generate(&env);
            let token_admin = Address::generate(&env);
            let token_id = env
                .register_stellar_asset_contract_v2(token_admin.clone())
                .address();
            StellarAssetClient::new(&env, &token_id).mint(&owner, &10_000);
            let escrow_id = env.register(CampaignEscrow, ());
            let client = CampaignEscrowClient::new(&env, &escrow_id);
            client.initialize_campaign(
                &BytesN::from_array(&env, &[1; 32]),
                &owner,
                &admin,
                &token_id,
                &START,
                &END,
            );
            Self {
                env,
                owner,
                admin,
                outsider,
                distributor,
                token_id,
                escrow_id,
            }
        }

        fn client(&self) -> CampaignEscrowClient<'_> {
            CampaignEscrowClient::new(&self.env, &self.escrow_id)
        }

        fn fund_and_activate(&self, amount: i128) {
            let client = self.client();
            client.fund_campaign(&self.owner, &amount);
            self.env.ledger().set_timestamp(START);
            client.activate_campaign(&self.owner);
        }

        fn end_campaign(&self) {
            self.env.ledger().set_timestamp(END + 1);
        }
    }

    #[test]
    fn complete_lifecycle_settles_allocation_and_refunds_remainder() {
        let fixture = Fixture::new();
        fixture.fund_and_activate(1_000);
        fixture.end_campaign();
        let client = fixture.client();
        let allocation_hash = BytesN::from_array(&fixture.env, &[7; 32]);
        client.finalize_campaign(&fixture.admin, &allocation_hash, &800, &3);
        client.settle_campaign(&fixture.admin, &fixture.distributor);

        let campaign = client.campaign();
        assert_eq!(campaign.status, CampaignStatus::Settled);
        assert_eq!(campaign.total_distributed, 800);
        assert_eq!(campaign.total_refunded, 200);
        assert_eq!(client.reward_balance(), 0);
        let token = TokenClient::new(&fixture.env, &fixture.token_id);
        assert_eq!(token.balance(&fixture.distributor), 800);
        assert_eq!(token.balance(&fixture.escrow_id), 0);
    }

    #[test]
    fn only_admin_can_finalize() {
        let fixture = Fixture::new();
        fixture.fund_and_activate(500);
        fixture.end_campaign();
        assert_eq!(
            fixture.client().try_finalize_campaign(
                &fixture.owner,
                &BytesN::from_array(&fixture.env, &[2; 32]),
                &500,
                &1,
            ),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                EscrowError::Unauthorized as u32,
            )))
        );
    }

    #[test]
    fn rejects_invalid_funding_amount() {
        let fixture = Fixture::new();
        assert_eq!(
            fixture.client().try_fund_campaign(&fixture.owner, &0),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                EscrowError::InvalidAmount as u32,
            )))
        );
        assert_eq!(
            fixture.client().try_fund_campaign(&fixture.owner, &-1),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                EscrowError::InvalidAmount as u32,
            )))
        );
    }

    #[test]
    fn cannot_finalize_twice() {
        let fixture = Fixture::new();
        fixture.fund_and_activate(500);
        fixture.end_campaign();
        let client = fixture.client();
        let hash = BytesN::from_array(&fixture.env, &[3; 32]);
        client.finalize_campaign(&fixture.admin, &hash, &500, &1);
        assert_eq!(
            client.try_finalize_campaign(&fixture.admin, &hash, &500, &1),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                EscrowError::InvalidStatus as u32,
            )))
        );
    }

    #[test]
    fn pause_and_resume_preserve_funds() {
        let fixture = Fixture::new();
        fixture.fund_and_activate(500);
        let client = fixture.client();
        client.pause_campaign(&fixture.admin);
        assert_eq!(client.campaign_status(), CampaignStatus::Paused);
        client.resume_campaign(&fixture.owner);
        assert_eq!(client.campaign_status(), CampaignStatus::Active);
        assert_eq!(client.reward_balance(), 500);
    }

    #[test]
    fn paused_campaign_can_refund_protocol_owner() {
        let fixture = Fixture::new();
        fixture.fund_and_activate(500);
        let client = fixture.client();
        client.pause_campaign(&fixture.admin);
        client.refund_campaign(&fixture.owner);
        assert_eq!(client.campaign_status(), CampaignStatus::Refunded);
        assert_eq!(client.reward_balance(), 0);
        assert_eq!(
            TokenClient::new(&fixture.env, &fixture.token_id).balance(&fixture.owner),
            10_000
        );
    }

    #[test]
    fn allocation_cannot_exceed_reward_pool() {
        let fixture = Fixture::new();
        fixture.fund_and_activate(500);
        fixture.end_campaign();
        assert_eq!(
            fixture.client().try_finalize_campaign(
                &fixture.admin,
                &BytesN::from_array(&fixture.env, &[4; 32]),
                &501,
                &1,
            ),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                EscrowError::AllocationExceedsPool as u32,
            )))
        );
    }

    #[test]
    fn expired_campaign_cannot_activate() {
        let fixture = Fixture::new();
        fixture.client().fund_campaign(&fixture.owner, &500);
        fixture.end_campaign();
        assert_eq!(
            fixture.client().try_activate_campaign(&fixture.owner),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                EscrowError::CampaignExpired as u32,
            )))
        );
    }

    #[test]
    fn campaign_without_participants_cannot_finalize() {
        let fixture = Fixture::new();
        fixture.fund_and_activate(500);
        fixture.end_campaign();
        assert_eq!(
            fixture.client().try_finalize_campaign(
                &fixture.admin,
                &BytesN::from_array(&fixture.env, &[5; 32]),
                &500,
                &0,
            ),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                EscrowError::NoParticipants as u32,
            )))
        );
    }

    #[test]
    fn outsider_cannot_fund_or_control_campaign() {
        let fixture = Fixture::new();
        assert_eq!(
            fixture.client().try_fund_campaign(&fixture.outsider, &500),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                EscrowError::Unauthorized as u32,
            )))
        );
    }
}
