#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, token,
    xdr::ToXdr, Address, Bytes, BytesN, Env, Vec,
};

#[contract]
pub struct RewardDistributor;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DistributorStatus {
    Initialized,
    AllocationCommitted,
    Complete,
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Distribution {
    pub campaign_id: BytesN<32>,
    pub admin: Address,
    pub protocol_owner: Address,
    pub reward_asset: Address,
    pub claim_deadline: u64,
    pub status: DistributorStatus,
    pub allocation_root: Option<BytesN<32>>,
    pub allocation_total: i128,
    pub participant_count: u32,
    pub total_distributed: i128,
    pub total_refunded: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AllocationLeaf {
    pub campaign_id: BytesN<32>,
    pub wallet: Address,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MerkleStep {
    Left(BytesN<32>),
    Right(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ClaimRequest {
    pub wallet: Address,
    pub amount: i128,
    pub proof: Vec<MerkleStep>,
}

#[contracttype]
enum DataKey {
    Distribution,
    Claimed(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum DistributorError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InvalidDeadline = 4,
    Unauthorized = 5,
    InvalidStatus = 6,
    NoParticipants = 7,
    InsufficientBalance = 8,
    InvalidProof = 9,
    AlreadyClaimed = 10,
    AllocationExceeded = 11,
    ClaimExpired = 12,
    RefundNotAvailable = 13,
    NothingToRefund = 14,
}

#[contractevent(topics = ["distribution", "initialized"])]
pub struct DistributorInitialized {
    #[topic]
    pub campaign_id: BytesN<32>,
    #[topic]
    pub protocol_owner: Address,
    pub admin: Address,
    pub reward_asset: Address,
    pub claim_deadline: u64,
}

#[contractevent(topics = ["allocation", "committed"])]
pub struct AllocationCommitted {
    #[topic]
    pub campaign_id: BytesN<32>,
    pub allocation_root: BytesN<32>,
    pub allocation_total: i128,
    pub participant_count: u32,
}

#[contractevent(topics = ["reward", "claimed"])]
pub struct RewardClaimed {
    #[topic]
    pub campaign_id: BytesN<32>,
    #[topic]
    pub wallet: Address,
    pub amount: i128,
}

#[contractevent(topics = ["reward", "batch"])]
pub struct BatchDistributed {
    #[topic]
    pub campaign_id: BytesN<32>,
    pub recipient_count: u32,
    pub amount: i128,
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
impl RewardDistributor {
    pub fn initialize(
        env: Env,
        campaign_id: BytesN<32>,
        admin: Address,
        protocol_owner: Address,
        reward_asset: Address,
        claim_deadline: u64,
    ) {
        if env.storage().instance().has(&DataKey::Distribution) {
            panic_with_error!(&env, DistributorError::AlreadyInitialized);
        }
        if claim_deadline <= env.ledger().timestamp() {
            panic_with_error!(&env, DistributorError::InvalidDeadline);
        }

        admin.require_auth();
        let distribution = Distribution {
            campaign_id: campaign_id.clone(),
            admin: admin.clone(),
            protocol_owner: protocol_owner.clone(),
            reward_asset: reward_asset.clone(),
            claim_deadline,
            status: DistributorStatus::Initialized,
            allocation_root: None,
            allocation_total: 0,
            participant_count: 0,
            total_distributed: 0,
            total_refunded: 0,
        };
        write_distribution(&env, &distribution);

        DistributorInitialized {
            campaign_id,
            protocol_owner,
            admin,
            reward_asset,
            claim_deadline,
        }
        .publish(&env);
    }

    pub fn commit_allocation(
        env: Env,
        caller: Address,
        allocation_root: BytesN<32>,
        allocation_total: i128,
        participant_count: u32,
    ) {
        require_positive_amount(&env, allocation_total);
        if participant_count == 0 {
            panic_with_error!(&env, DistributorError::NoParticipants);
        }

        let mut distribution = read_distribution(&env);
        require_admin(&env, &distribution, &caller);
        require_status(&env, &distribution, DistributorStatus::Initialized);
        if env.ledger().timestamp() >= distribution.claim_deadline {
            panic_with_error!(&env, DistributorError::ClaimExpired);
        }
        if token_balance(&env, &distribution) < allocation_total {
            panic_with_error!(&env, DistributorError::InsufficientBalance);
        }

        caller.require_auth();
        distribution.status = DistributorStatus::AllocationCommitted;
        distribution.allocation_root = Some(allocation_root.clone());
        distribution.allocation_total = allocation_total;
        distribution.participant_count = participant_count;
        write_distribution(&env, &distribution);

        AllocationCommitted {
            campaign_id: distribution.campaign_id,
            allocation_root,
            allocation_total,
            participant_count,
        }
        .publish(&env);
    }

    pub fn claim(env: Env, wallet: Address, amount: i128, proof: Vec<MerkleStep>) {
        wallet.require_auth();
        distribute_claim(&env, wallet, amount, proof);
    }

    pub fn batch_distribute(env: Env, caller: Address, claims: Vec<ClaimRequest>) {
        let distribution = read_distribution(&env);
        require_admin(&env, &distribution, &caller);
        require_status(&env, &distribution, DistributorStatus::AllocationCommitted);
        caller.require_auth();

        let mut recipient_count = 0_u32;
        let mut amount = 0_i128;
        for request in claims.iter() {
            amount += request.amount;
            recipient_count += 1;
            distribute_claim(&env, request.wallet, request.amount, request.proof);
        }

        BatchDistributed {
            campaign_id: read_distribution(&env).campaign_id,
            recipient_count,
            amount,
        }
        .publish(&env);
    }

    pub fn refund_undistributed(env: Env, caller: Address) {
        let mut distribution = read_distribution(&env);
        require_admin_or_owner(&env, &distribution, &caller);
        if distribution.status != DistributorStatus::AllocationCommitted {
            panic_with_error!(&env, DistributorError::RefundNotAvailable);
        }
        if env.ledger().timestamp() <= distribution.claim_deadline {
            panic_with_error!(&env, DistributorError::RefundNotAvailable);
        }

        let amount = token_balance(&env, &distribution);
        if amount <= 0 {
            panic_with_error!(&env, DistributorError::NothingToRefund);
        }

        caller.require_auth();
        token::Client::new(&env, &distribution.reward_asset).transfer(
            &env.current_contract_address(),
            &distribution.protocol_owner,
            &amount,
        );
        distribution.total_refunded += amount;
        distribution.status = DistributorStatus::Refunded;
        write_distribution(&env, &distribution);

        CampaignRefunded {
            campaign_id: distribution.campaign_id,
            protocol_owner: distribution.protocol_owner,
            amount,
        }
        .publish(&env);
    }

    pub fn has_claimed(env: Env, wallet: Address) -> bool {
        is_claimed(&env, &wallet)
    }

    pub fn distributed_amount(env: Env) -> i128 {
        read_distribution(&env).total_distributed
    }

    pub fn reward_balance(env: Env) -> i128 {
        token_balance(&env, &read_distribution(&env))
    }

    pub fn distribution(env: Env) -> Distribution {
        read_distribution(&env)
    }

    pub fn allocation_leaf_hash(
        env: Env,
        campaign_id: BytesN<32>,
        wallet: Address,
        amount: i128,
    ) -> BytesN<32> {
        require_positive_amount(&env, amount);
        hash_leaf(
            &env,
            &AllocationLeaf {
                campaign_id,
                wallet,
                amount,
            },
        )
    }
}

fn distribute_claim(env: &Env, wallet: Address, amount: i128, proof: Vec<MerkleStep>) {
    require_positive_amount(env, amount);
    if is_claimed(env, &wallet) {
        panic_with_error!(env, DistributorError::AlreadyClaimed);
    }
    let mut distribution = read_distribution(env);
    require_status(env, &distribution, DistributorStatus::AllocationCommitted);
    if env.ledger().timestamp() > distribution.claim_deadline {
        panic_with_error!(env, DistributorError::ClaimExpired);
    }
    if distribution.total_distributed + amount > distribution.allocation_total {
        panic_with_error!(env, DistributorError::AllocationExceeded);
    }

    let leaf = AllocationLeaf {
        campaign_id: distribution.campaign_id.clone(),
        wallet: wallet.clone(),
        amount,
    };
    let root = distribution
        .allocation_root
        .clone()
        .unwrap_or_else(|| panic_with_error!(env, DistributorError::InvalidStatus));
    if !verify_proof(env, hash_leaf(env, &leaf), proof, &root) {
        panic_with_error!(env, DistributorError::InvalidProof);
    }
    if token_balance(env, &distribution) < amount {
        panic_with_error!(env, DistributorError::InsufficientBalance);
    }

    env.storage()
        .persistent()
        .set(&DataKey::Claimed(wallet.clone()), &true);
    token::Client::new(env, &distribution.reward_asset).transfer(
        &env.current_contract_address(),
        &wallet,
        &amount,
    );
    distribution.total_distributed += amount;
    if distribution.total_distributed == distribution.allocation_total {
        distribution.status = DistributorStatus::Complete;
    }
    write_distribution(env, &distribution);

    RewardClaimed {
        campaign_id: distribution.campaign_id,
        wallet,
        amount,
    }
    .publish(env);
}

fn hash_leaf(env: &Env, leaf: &AllocationLeaf) -> BytesN<32> {
    env.crypto().sha256(&leaf.clone().to_xdr(env)).to_bytes()
}

fn hash_pair(env: &Env, left: &BytesN<32>, right: &BytesN<32>) -> BytesN<32> {
    let mut bytes = Bytes::new(env);
    bytes.append(left.as_ref());
    bytes.append(right.as_ref());
    env.crypto().sha256(&bytes).to_bytes()
}

fn verify_proof(
    env: &Env,
    mut current: BytesN<32>,
    proof: Vec<MerkleStep>,
    root: &BytesN<32>,
) -> bool {
    for step in proof.iter() {
        current = match step {
            MerkleStep::Left(sibling) => hash_pair(env, &sibling, &current),
            MerkleStep::Right(sibling) => hash_pair(env, &current, &sibling),
        };
    }
    &current == root
}

fn read_distribution(env: &Env) -> Distribution {
    env.storage()
        .instance()
        .get(&DataKey::Distribution)
        .unwrap_or_else(|| panic_with_error!(env, DistributorError::NotInitialized))
}

fn write_distribution(env: &Env, distribution: &Distribution) {
    env.storage()
        .instance()
        .set(&DataKey::Distribution, distribution);
}

fn is_claimed(env: &Env, wallet: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Claimed(wallet.clone()))
        .unwrap_or(false)
}

fn token_balance(env: &Env, distribution: &Distribution) -> i128 {
    token::Client::new(env, &distribution.reward_asset).balance(&env.current_contract_address())
}

fn require_positive_amount(env: &Env, amount: i128) {
    if amount <= 0 {
        panic_with_error!(env, DistributorError::InvalidAmount);
    }
}

fn require_status(env: &Env, distribution: &Distribution, expected: DistributorStatus) {
    if distribution.status != expected {
        panic_with_error!(env, DistributorError::InvalidStatus);
    }
}

fn require_admin(env: &Env, distribution: &Distribution, caller: &Address) {
    if caller != &distribution.admin {
        panic_with_error!(env, DistributorError::Unauthorized);
    }
}

fn require_admin_or_owner(env: &Env, distribution: &Distribution, caller: &Address) {
    if caller != &distribution.admin && caller != &distribution.protocol_owner {
        panic_with_error!(env, DistributorError::Unauthorized);
    }
}

#[cfg(test)]
mod test {
    extern crate std;

    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger as _},
        token::{StellarAssetClient, TokenClient},
        vec, Env,
    };

    const CLAIM_DEADLINE: u64 = 500;

    struct Fixture {
        env: Env,
        admin: Address,
        owner: Address,
        outsider: Address,
        alice: Address,
        bob: Address,
        token_id: Address,
        distributor_id: Address,
        campaign_id: BytesN<32>,
    }

    impl Fixture {
        fn new() -> Self {
            let env = Env::default();
            env.mock_all_auths();
            env.ledger().set_timestamp(100);
            let admin = Address::generate(&env);
            let owner = Address::generate(&env);
            let outsider = Address::generate(&env);
            let alice = Address::generate(&env);
            let bob = Address::generate(&env);
            let token_admin = Address::generate(&env);
            let token_id = env
                .register_stellar_asset_contract_v2(token_admin.clone())
                .address();
            let distributor_id = env.register(RewardDistributor, ());
            let campaign_id = BytesN::from_array(&env, &[1; 32]);
            RewardDistributorClient::new(&env, &distributor_id).initialize(
                &campaign_id,
                &admin,
                &owner,
                &token_id,
                &CLAIM_DEADLINE,
            );
            Self {
                env,
                admin,
                owner,
                outsider,
                alice,
                bob,
                token_id,
                distributor_id,
                campaign_id,
            }
        }

        fn client(&self) -> RewardDistributorClient<'_> {
            RewardDistributorClient::new(&self.env, &self.distributor_id)
        }

        fn mint_to_distributor(&self, amount: i128) {
            StellarAssetClient::new(&self.env, &self.token_id).mint(&self.distributor_id, &amount);
        }

        fn leaf(&self, wallet: &Address, amount: i128) -> BytesN<32> {
            hash_leaf(
                &self.env,
                &AllocationLeaf {
                    campaign_id: self.campaign_id.clone(),
                    wallet: wallet.clone(),
                    amount,
                },
            )
        }

        fn commit_single(&self, wallet: &Address, amount: i128) {
            self.mint_to_distributor(amount);
            self.client()
                .commit_allocation(&self.admin, &self.leaf(wallet, amount), &amount, &1);
        }
    }

    #[test]
    fn one_participant_can_claim() {
        let fixture = Fixture::new();
        fixture.commit_single(&fixture.alice, 400);
        fixture
            .client()
            .claim(&fixture.alice, &400, &Vec::<MerkleStep>::new(&fixture.env));

        assert!(fixture.client().has_claimed(&fixture.alice));
        assert_eq!(fixture.client().distributed_amount(), 400);
        assert_eq!(
            fixture.client().distribution().status,
            DistributorStatus::Complete
        );
        assert_eq!(
            TokenClient::new(&fixture.env, &fixture.token_id).balance(&fixture.alice),
            400
        );
    }

    #[test]
    fn double_claim_is_rejected() {
        let fixture = Fixture::new();
        fixture.commit_single(&fixture.alice, 400);
        let proof = Vec::<MerkleStep>::new(&fixture.env);
        fixture.client().claim(&fixture.alice, &400, &proof);
        assert_eq!(
            fixture.client().try_claim(&fixture.alice, &400, &proof),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                DistributorError::AlreadyClaimed as u32,
            )))
        );
    }

    #[test]
    fn ineligible_wallet_and_wrong_amount_are_rejected() {
        let fixture = Fixture::new();
        fixture.commit_single(&fixture.alice, 400);
        let proof = Vec::<MerkleStep>::new(&fixture.env);
        assert_eq!(
            fixture.client().try_claim(&fixture.bob, &400, &proof),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                DistributorError::InvalidProof as u32,
            )))
        );
        assert_eq!(
            fixture.client().try_claim(&fixture.alice, &399, &proof),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                DistributorError::InvalidProof as u32,
            )))
        );
    }

    #[test]
    fn allocation_requires_sufficient_escrow_balance() {
        let fixture = Fixture::new();
        assert_eq!(
            fixture.client().try_commit_allocation(
                &fixture.admin,
                &fixture.leaf(&fixture.alice, 400),
                &400,
                &1,
            ),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                DistributorError::InsufficientBalance as u32,
            )))
        );
    }

    #[test]
    fn claim_requires_committed_allocation() {
        let fixture = Fixture::new();
        assert_eq!(
            fixture
                .client()
                .try_claim(&fixture.alice, &100, &Vec::<MerkleStep>::new(&fixture.env),),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                DistributorError::InvalidStatus as u32,
            )))
        );
    }

    #[test]
    fn batch_distributes_to_multiple_participants() {
        let fixture = Fixture::new();
        let alice_leaf = fixture.leaf(&fixture.alice, 300);
        let bob_leaf = fixture.leaf(&fixture.bob, 200);
        let root = hash_pair(&fixture.env, &alice_leaf, &bob_leaf);
        fixture.mint_to_distributor(500);
        fixture
            .client()
            .commit_allocation(&fixture.admin, &root, &500, &2);

        let claims = vec![
            &fixture.env,
            ClaimRequest {
                wallet: fixture.alice.clone(),
                amount: 300,
                proof: vec![&fixture.env, MerkleStep::Right(bob_leaf)],
            },
            ClaimRequest {
                wallet: fixture.bob.clone(),
                amount: 200,
                proof: vec![&fixture.env, MerkleStep::Left(alice_leaf)],
            },
        ];
        fixture.client().batch_distribute(&fixture.admin, &claims);

        let token = TokenClient::new(&fixture.env, &fixture.token_id);
        assert_eq!(token.balance(&fixture.alice), 300);
        assert_eq!(token.balance(&fixture.bob), 200);
        assert_eq!(fixture.client().distributed_amount(), 500);
        assert_eq!(
            fixture.client().distribution().status,
            DistributorStatus::Complete
        );
    }

    #[test]
    fn zero_participant_allocation_is_rejected() {
        let fixture = Fixture::new();
        fixture.mint_to_distributor(100);
        assert_eq!(
            fixture.client().try_commit_allocation(
                &fixture.admin,
                &fixture.leaf(&fixture.alice, 100),
                &100,
                &0,
            ),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                DistributorError::NoParticipants as u32,
            )))
        );
    }

    #[test]
    fn unclaimed_funds_return_to_protocol_owner_after_deadline() {
        let fixture = Fixture::new();
        let alice_leaf = fixture.leaf(&fixture.alice, 300);
        let bob_leaf = fixture.leaf(&fixture.bob, 200);
        fixture.mint_to_distributor(500);
        fixture.client().commit_allocation(
            &fixture.admin,
            &hash_pair(&fixture.env, &alice_leaf, &bob_leaf),
            &500,
            &2,
        );
        fixture.client().claim(
            &fixture.alice,
            &300,
            &vec![&fixture.env, MerkleStep::Right(bob_leaf)],
        );

        fixture.env.ledger().set_timestamp(CLAIM_DEADLINE + 1);
        fixture.client().refund_undistributed(&fixture.owner);

        assert_eq!(
            TokenClient::new(&fixture.env, &fixture.token_id).balance(&fixture.owner),
            200
        );
        assert_eq!(
            fixture.client().distribution().status,
            DistributorStatus::Refunded
        );
    }

    #[test]
    fn refund_is_locked_until_claim_deadline() {
        let fixture = Fixture::new();
        fixture.commit_single(&fixture.alice, 100);
        assert_eq!(
            fixture.client().try_refund_undistributed(&fixture.owner),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                DistributorError::RefundNotAvailable as u32,
            )))
        );
    }

    #[test]
    fn only_admin_can_commit_allocation() {
        let fixture = Fixture::new();
        fixture.mint_to_distributor(100);
        assert_eq!(
            fixture.client().try_commit_allocation(
                &fixture.outsider,
                &fixture.leaf(&fixture.alice, 100),
                &100,
                &1,
            ),
            Err(Ok(soroban_sdk::Error::from_contract_error(
                DistributorError::Unauthorized as u32,
            )))
        );
    }
}
