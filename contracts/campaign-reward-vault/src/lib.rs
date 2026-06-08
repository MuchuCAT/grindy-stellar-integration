#![no_std]

use soroban_sdk::{
	contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, token,
	Address, Env,
};

#[contract]
pub struct CampaignRewardVault;

#[contracttype]
#[derive(Clone)]
enum DataKey {
	Admin,
	Balance(Address),
	Total,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VaultError {
	AlreadyInitialized = 1,
	NotInitialized = 2,
	InvalidAmount = 3,
	InsufficientBalance = 4,
}

#[contractevent(topics = ["vault", "init"])]
pub struct VaultInitialized {
	#[topic]
	pub admin: Address,
}

#[contractevent(topics = ["vault", "deposit"])]
pub struct VaultDeposit {
	#[topic]
	pub token: Address,
	#[topic]
	pub wallet: Address,
	pub amount: i128,
}

#[contractevent(topics = ["vault", "withdraw"])]
pub struct VaultWithdraw {
	#[topic]
	pub token: Address,
	#[topic]
	pub wallet: Address,
	pub amount: i128,
}

#[contractimpl]
impl CampaignRewardVault {
	pub fn init(env: Env, admin: Address) {
		if env.storage().instance().has(&DataKey::Admin) {
			panic_with_error!(&env, VaultError::AlreadyInitialized);
		}

		admin.require_auth();
		env.storage().instance().set(&DataKey::Admin, &admin);
		env.storage().persistent().set(&DataKey::Total, &0_i128);
		VaultInitialized { admin }.publish(&env);
	}

	pub fn deposit(env: Env, token: Address, from: Address, amount: i128) {
		require_initialized(&env);
		require_positive_amount(&env, amount);

		from.require_auth();
		let token_client = token::Client::new(&env, &token);
		token_client.transfer(&from, &env.current_contract_address(), &amount);

		let balance_key = DataKey::Balance(from.clone());
		let current_balance = read_i128(&env, &balance_key);
		let current_total = read_i128(&env, &DataKey::Total);

		env.storage()
			.persistent()
			.set(&balance_key, &(current_balance + amount));
		env.storage()
			.persistent()
			.set(&DataKey::Total, &(current_total + amount));

		VaultDeposit {
			token,
			wallet: from,
			amount,
		}
		.publish(&env);
	}

	pub fn withdraw(env: Env, token: Address, to: Address, amount: i128) {
		require_initialized(&env);
		require_positive_amount(&env, amount);

		to.require_auth();
		let balance_key = DataKey::Balance(to.clone());
		let current_balance = read_i128(&env, &balance_key);
		if current_balance < amount {
			panic_with_error!(&env, VaultError::InsufficientBalance);
		}

		let current_total = read_i128(&env, &DataKey::Total);
		env.storage()
			.persistent()
			.set(&balance_key, &(current_balance - amount));
		env.storage()
			.persistent()
			.set(&DataKey::Total, &(current_total - amount));

		let token_client = token::Client::new(&env, &token);
		token_client.transfer(&env.current_contract_address(), &to, &amount);
		VaultWithdraw {
			token,
			wallet: to,
			amount,
		}
		.publish(&env);
	}

	pub fn balance(env: Env, user: Address) -> i128 {
		read_i128(&env, &DataKey::Balance(user))
	}

	pub fn total_deposited(env: Env) -> i128 {
		read_i128(&env, &DataKey::Total)
	}

	pub fn admin(env: Env) -> Address {
		require_initialized(&env);
		env.storage()
			.instance()
			.get(&DataKey::Admin)
			.unwrap_or_else(|| panic_with_error!(&env, VaultError::NotInitialized))
	}
}

fn require_initialized(env: &Env) {
	if !env.storage().instance().has(&DataKey::Admin) {
		panic_with_error!(env, VaultError::NotInitialized);
	}
}

fn require_positive_amount(env: &Env, amount: i128) {
	if amount <= 0 {
		panic_with_error!(env, VaultError::InvalidAmount);
	}
}

fn read_i128(env: &Env, key: &DataKey) -> i128 {
	env.storage().persistent().get(key).unwrap_or(0_i128)
}

#[cfg(test)]
mod test {
	extern crate std;

	use super::*;
	use soroban_sdk::{
		testutils::Address as _,
		token::{StellarAssetClient, TokenClient},
		Env,
	};

	fn create_token(env: &Env, admin: &Address) -> Address {
		env.register_stellar_asset_contract_v2(admin.clone()).address()
	}

	#[test]
	fn deposit_and_withdraw_roundtrip() {
		let env = Env::default();
		env.mock_all_auths();

		let admin = Address::generate(&env);
		let user = Address::generate(&env);
		let token_id = create_token(&env, &admin);
		let asset_client = StellarAssetClient::new(&env, &token_id);
		let token_client = TokenClient::new(&env, &token_id);
		asset_client.mint(&user, &1_000);

		let vault_id = env.register(CampaignRewardVault, ());
		let vault = CampaignRewardVaultClient::new(&env, &vault_id);
		vault.init(&admin);

		vault.deposit(&token_id, &user, &250);
		assert_eq!(vault.balance(&user), 250);
		assert_eq!(vault.total_deposited(), 250);
		assert_eq!(token_client.balance(&user), 750);
		assert_eq!(token_client.balance(&vault_id), 250);

		vault.withdraw(&token_id, &user, &100);
		assert_eq!(vault.balance(&user), 150);
		assert_eq!(vault.total_deposited(), 150);
		assert_eq!(token_client.balance(&user), 850);
		assert_eq!(token_client.balance(&vault_id), 150);
	}
}
