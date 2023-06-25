
# Fullstack Solana Vault Application Tutorial

In this tutorial we aim to build a Solana program and deploy it to the devnet. Then we will build a React web app to interact with our program. This tutorial assumes that you have some programming experience and built to give a brief introduction to building decentralized applications on Solana.

### Functionalities of our applications
We want users to:   
*   Generate vaults
*   Send Sol to their vaults
*   Withdraw Sol from their vaults
*   Change ownership of their vaults

We can say that this will be a simple account abstraction project and vaults in our application will be on-chain wallets keeping Sol.

### Prequisties
* Programming experience
* Javascript
* Familiarity with Rust syntax

### Why Rust
Rust is a memory safe, systems programming language. Here memory safe part is actually very important. In languages C, C++ memory management is handled by the programmer this can lead to unwanted bugs. On the other hand in Java and many languages there is an automatic memory management, it makes developers jobs much more easier but reduces the control over memory and opens up new potential pitfalls. Rust ensures that memory is managed safely without sacrificing performance.


### Overview of a Solana Program
For those who are familiar with EVM; in Solana, smart contracts are called as Programs and on-chain functionalities is handled by these programs. Solana programs represent the logic that will be run on-chain and do not store any data. Instead data is stored on Program Derived Accounts. In our example our vaults be stored as Program Derived Accounts (PDA's), keeping the information of how many Sol in the Vault and the owner of it etc... On the other hand Solana program will manage these vaults by changing the variables stored in the PDA, ex. changing the owner, decreasing the amount stored on withdraw.


### Developing the Rust program

#### Initialize the project
First create a new React app    
    `npx create-react-app vault-solana`

Then cd into new app and make a make a new Rust project 
    `cd vault-solana`       
    `cargo new program --lib`
    `cd program`

This is where we will work fon our program

Create a `Xargo.toml` file and in the file paste    
```rust
[target.bpfel-unknown-unknown.dependencies.std]
features = []
```

On your `Cargo.toml` file paste

```
[package]
name = "program"
version = "0.1.0"
edition = "2018"

[dependencies]
solana-program = "1.7.14"
borsh = "0.9.1"
borsh-derive = "0.9.1"

[features]
no-entrypoint = []

[dev-dependencies]
solana-program-test = "1.7.14"
solana-sdk = "1.7.14"

[lib]
crate-type = ["cdylib", "lib"]
```

Here we handled dependencies. To get them run `cargo check`.

#### Entrypoint

Let's start coding our project. We will use `lib.rs` in  `src` directory. Our Solana program will have many functionalities and users will be interacing with them. Although we will have many functionalities users can only interact with one function. So we will build a function and based on the inputs of this function we will call other functions in our program. We call this one function the entrypoint of the program.

First we import required libraries 

```
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};
use borsh::{BorshDeserialize, BorshSerialize};
```

Then we write our entrypoint

```
fn process_instruction(
    program_id: &Pubkey,

    accounts: &[AccountInfo],

    instruction_data: &[u8],
    
) -> ProgramResult {

    if instruction_data.len() == 0 {
        return Err(ProgramError::InvalidInstructionData);
    }

    if instruction_data[0] == 0 {
        return create_vault(
            program_id,
            accounts,
            &instruction_data[1..instruction_data.len()],
        );
    } else if instruction_data[0] == 1 {
        return withdraw(
            program_id,
            accounts,
            &instruction_data[1..instruction_data.len()],
        );
    } else if instruction_data[0] == 2 {
        return insert(
            program_id,
            accounts,
            &instruction_data[1..instruction_data.len()],
        );
    }
    
    msg!("Didn't find the entrypoint required");
    Err(ProgramError::InvalidInstructionData)
}


entrypoint!(process_instruction);
```

Here the first input `program_id` represent the id of this program. `accounts` are the accounts we want to integrate with. Lastly `instruction_data` is highly important since all the data lies there. As you can see it is an `u8` array, all the data we send to this program first we serialize them using BorshSerialize and have a `u8` array format of the data, then we deserialize it using BorshDeserialize with giving a correct struct form and we reach our data. This is how we process the data so on the frontend to interact with our program, we will specify accounts we will be interacting with, serialize the data then call the entrypoint. Entrypoint distinguishes which fucntion to call from the first element of the `instruction_data`. Ex. if the first element is `0` it calls the `create_vault` function.

If entrypoint does not find any functions to call based on the first element of the instruction data, it returns an InvalidInstructionData error.

#### Structs

To recieve structured data we need to build structs which will represent the shape of the data and deserialize the `u8` instruction data array accordingly. In our program we will need a struct for processing the vault generation and withdraw or insert requests. At the end of this tutorial we will also implement change owner functionality and add a struct accordingly.

```
#[derive(BorshSerialize, BorshDeserialize, Debug)]
struct Vault {
    pub admin: Pubkey,
    pub name: String,
    pub description: String,
    pub image_link: String,
    pub amount: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
struct WithdrawRequest {
    pub amount: u64,
}
```


#### Create Vault

```
fn create_vault(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {


    Ok(())
}
```

This will be the initial structure of our function. We will first process accounts, then deserialize the input and have a structured data. Lastly we will write this data into aimed PDA and return the function.


```
fn create_vault(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {

    let accounts_iter = &mut accounts.iter();

    let writing_account = next_account_info(accounts_iter)?;

    let creator_account = next_account_info(accounts_iter)?;

    if !creator_account.is_signer {
        msg!("creator_account should be signer");
        return Err(ProgramError::IncorrectProgramId);
    }

    if writing_account.owner != program_id {
        msg!("writing_account isn't owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    Ok(())
}
```

First we iterate over accounts, from the frontedn we will be sending two accounts. First account will be the PDA that we want to write data on, second is our Solana account which we will sign this transaction. Here we derive those accounts then we check if the PDA we want to write on is actually owned by this Solana program and if this transaction is actually signed by the account we have given as input.

```
let mut input_data = Vault::try_from_slice(&instruction_data)
        .expect("Instruction data serialization didn't worked");
```

To process the data we will use `Vault struct` and get required information for our vault. Then we will store this data on a PDA but to do so first we need to know what rent exemption is. In Solana to store data on-chain you need to pay a fee called "rent". As the size of the data increases rent will increase accordingly. From Solana docs "Accounts that maintain a minimum LAMPORT balance greater than 2 years worth of rent payments are considered "rent exempt" and will not incur a rent collection.". This means that to store data on PDA we need to pay rent enough for 2 years initially. Then it will reside on Solana blockchain.

```
    let rent_exemption = Rent::get()?.minimum_balance(writing_account.data_len());

    if **writing_account.lamports.borrow() < rent_exemption {
        msg!("The balance of writing_account should be more then rent_exemption");
        return Err(ProgramError::InsufficientFunds);
```

Here first we get what is the rent exemption amount and then we check if the PDA we sent has the required amount of Lamports.

```
input_data.serialize(&mut &mut writing_account.data.borrow_mut()[..])?;
```

Lastly we serialize back the input data to the PDA we are writing to. Here is the last view of our `create_vault` function.

```
fn create_vault(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {

    let accounts_iter = &mut accounts.iter();

    let writing_account = next_account_info(accounts_iter)?;

    let creator_account = next_account_info(accounts_iter)?;

    if !creator_account.is_signer {
        msg!("creator_account should be signer");
        return Err(ProgramError::IncorrectProgramId);
    }

    if writing_account.owner != program_id {
        msg!("writing_account isn't owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut input_data = Vault::try_from_slice(&instruction_data)
        .expect("Instruction data serialization didn't worked");

    let rent_exemption = Rent::get()?.minimum_balance(writing_account.data_len());

    if **writing_account.lamports.borrow() < rent_exemption {
        msg!("The balance of writing_account should be more then rent_exemption");
        return Err(ProgramError::InsufficientFunds);
    }

    input_data.amount=0;

    input_data.serialize(&mut &mut writing_account.data.borrow_mut()[..])?;


    Ok(())
}

```

#### Withdraw function
 
```
fn withdraw(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let writing_account = next_account_info(accounts_iter)?;

    let creator_account = next_account_info(accounts_iter)?;

    if !creator_account.is_signer {
        msg!("creator_account should be signer");
        return Err(ProgramError::IncorrectProgramId);
    }

    if writing_account.owner != program_id {
        msg!("writing_account isn't owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    Ok(())
}
```

As we have done before first we process accounts. Then check if the writing account is owned by the program and creator account is the signer of this function. Later we will process the required data from the PDA then change the data and write back the newly changed data to PDA (writing account).


```
let campaign_data = Vault::try_from_slice(*writing_account.data.borrow())
        .expect("Error deserializing data");
```

We read data from the PDA in a structured format.

```
if campaign_data.admin != *creator_account.key {
        msg!("only admins can withdraw");
        return Err(ProgramError::IncorrectProgramId);
    }
```

We check if this vault is acutally owned by the signer of this function. So that only owners can withdaw Sol from vaults.

```
let input_data = WithdrawRequest::try_from_slice(&instruction_data).expect("Value serialization failed");

let rent_exemption = Rent::get()?.minimum_balance(writing_account.data_len());

if **writing_account.lamports.borrow() - rent_exemption < input_data.amount {
        msg!("Insufficent balance");
        return Err(ProgramError::InsufficientFunds);
    }
```

We deserialized the input data then calculated the rent_exemption. Here what's important is that we shouldn't be withdrawing all lamports in the account so  some will be left to be rent exempt. Later the with if check we check if left lamport will be enough to be rent exempt.

```
**writing_account.try_borrow_mut_lamports()? -= input_data.amount;
**creator_account.try_borrow_mut_lamports()? += input_data.amount;
```

In these two lines we take lamports from the PDA owned by this program (vault) and send it to the signer of this transaction (owner of the vault).

```
let mut vault_data = Vault::try_from_slice(*writing_account.data.borrow()).expect("Serialization failed");

vault_data.amount -= input_data.amount;
vault_data.serialize(&mut &mut writing_account.data.borrow_mut()[..]) ?;
```

We update the data and write it back to PDA. This is the last view of our withdaw function.

```
fn withdraw(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let writing_account = next_account_info(accounts_iter)?;

    let creator_account = next_account_info(accounts_iter)?;

    if !creator_account.is_signer {
        msg!("creator_account should be signer");
        return Err(ProgramError::IncorrectProgramId);
    }

    if writing_account.owner != program_id {
        msg!("writing_account isn't owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    let campaign_data = Vault::try_from_slice(*writing_account.data.borrow())
        .expect("Error deserializing data");

    if campaign_data.admin != *creator_account.key {
        msg!("only admins can withdraw");
        return Err(ProgramError::IncorrectProgramId);
    }

    let input_data = WithdrawRequest::try_from_slice(&instruction_data).expect("Value serialization failed");

    let rent_exemption = Rent::get()?.minimum_balance(writing_account.data_len());

    if **writing_account.lamports.borrow() - rent_exemption < input_data.amount {
        msg!("Insufficent balance");
        return Err(ProgramError::InsufficientFunds);
    }

    **writing_account.try_borrow_mut_lamports()? -= input_data.amount;
    **creator_account.try_borrow_mut_lamports()? += input_data.amount;

    let mut vault_data = Vault::try_from_slice(*writing_account.data.borrow()).expect("Serialization failed");

    vault_data.amount -= input_data.amount;
    vault_data.serialize(&mut &mut writing_account.data.borrow_mut()[..]) ?;

    Ok(())
}

```


#### Insert function

On Solana a program can only send Lamports from an account that it owns. So in order to send Lamports to our vault first we need to create a new PDA that is owned by our program with the amount of Lamports we want to send and pass it as input. Then since our program owns that account it will get to withdraw the Lamports in it and transfer it to our vault. This PDA will be a like a temporary variable we don't need to save it so rent exemption is not important in this case.

```
fn insert(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let vault_account = next_account_info(accounts_iter)?;

    let temp_program_account = next_account_info(accounts_iter)?;

    let creator_account = next_account_info(accounts_iter)?;


    Ok(())

}
```

We start with account processing. In this function we ahve three accounts as mentioned. One represents the PDA of vault, other is the temporary PDA and carries the Lamport lastly the owner of the vault, signer of this transaction. 


```
if vault_account.owner != program_id {
    msg!("writing_account isn't owned by program");
    return Err(ProgramError::IncorrectProgramId);
}

if temp_program_account.owner != program_id {
    msg!("writing_account isn't owned by program");
    return Err(ProgramError::IncorrectProgramId);
}

if !creator_account.is_signer {
    msg!("donator_account should be signer");
    return Err(ProgramError::IncorrectProgramId);
}
```

In this code snippet we run our checks for accounts. Vault and Temp accounts should owned by the program and creator account should be the signer of this function. 


```
let mut vault_data = Vault::try_from_slice(*vault_account.data.borrow()).expect("Serialization failed");

vault_data.amount += **temp_program_account.lamports.borrow();
    
**vault_account.try_borrow_mut_lamports()? += **temp_program_account.lamports.borrow();
**temp_program_account.try_borrow_mut_lamports()? = 0;

vault_data.serialize(&mut &mut vault_account.data.borrow_mut()[..]) ?;
```

Lastly we deserialize vault data and transfer lamports from temp account to our vault, serialize the changed data back to the PDA and save it to reside on Solana blockchain.


### Deploy Program

To have a build of our program we will run cargo build.

`cargo build-bpf --manifest-path=Cargo.toml --bpf-out-dir=dist/program`

Later we will generate a keypair, request funds to it and deploy the build of our program with it. 

```
solana-keygen new -o keypair.json
``` 

Airdrop funds

```
solana airdrop 1 <publickey> --url https://api.devnet.solana.com 
```

Then deploy the build of program.

```
solana deploy dist/program/program.so --url https://api.devnet.solana.com --keypair keypair.json
```


Now you have a live program in Solana devnet. Further we will build a change owner functionality and a frontend to interact with the program. With this tutorial you grasped the structure of a Solana program and start building your programs. If you have any questions about this tutorial you can write an issue.

