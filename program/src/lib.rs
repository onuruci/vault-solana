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
        return donate(
            program_id,
            accounts,
            &instruction_data[1..instruction_data.len()],
        );
    }
    
    msg!("Didn't find the entrypoint required");
    Err(ProgramError::InvalidInstructionData)
}


entrypoint!(process_instruction);

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

    let rent_exemption = Rent::get()?.minimum_balance(writing_account.data_len());

    if **writing_account.lamports.borrow() < rent_exemption {
        msg!("The balance of writing_account should be more then rent_exemption");
        return Err(ProgramError::InsufficientFunds);
    }

    input_data.amount=0;

    input_data.serialize(&mut &mut writing_account.data.borrow_mut()[..])?;


    Ok(())
}


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

    let mut campaign_data = Vault::try_from_slice(*writing_account.data.borrow()).expect("Serialization failed");

    campaign_data.amount -= input_data.amount;
    campaign_data.serialize(&mut &mut writing_account.data.borrow_mut()[..]) ?;

    Ok(())
}


fn donate(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let campaign_account = next_account_info(accounts_iter)?;

    let donator_program_account = next_account_info(accounts_iter)?;

    let donator_account = next_account_info(accounts_iter)?;

    if campaign_account.owner != program_id {
        msg!("writing_account isn't owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if donator_program_account.owner != program_id {
        msg!("writing_account isn't owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if !donator_account.is_signer {
        msg!("donator_account should be signer");
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut campaign_data = Vault::try_from_slice(*campaign_account.data.borrow()).expect("Serialization failed");

    campaign_data.amount += **donator_program_account.lamports.borrow();
    
    **campaign_account.try_borrow_mut_lamports()? += **donator_program_account.lamports.borrow();
    **donator_program_account.try_borrow_mut_lamports()? = 0;

    campaign_data.serialize(&mut &mut campaign_account.data.borrow_mut()[..]) ?;

    Ok(())

}

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