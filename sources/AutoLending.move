module AutoLending::AutoLending {
    use std::signer;
    use std::timestamp;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    // Structs
    struct Vehicle has key {
        id: u64,
        dealer: address,
        price: u64,
        is_sold: bool,
    }

    struct LoanOffer has key {
        id: u64,
        lender: address,
        amount: u64,
        interest_rate: u64, // Percentage * 100 (e.g., 5% = 500)
        duration: u64, // Seconds
        active: bool,
    }

    struct Loan has key {
        offer_id: u64,
        customer: address,
        vehicle_id: u64,
        amount: u64,
        repaid_amount: u64,
        unlock_time: u64,
        in_escrow: bool,
    }

    struct Escrow has key {
        loan_id: u64,
        amount: u64,
    }

    // Initialize module (fixed warning)
    public entry fun initialize(_account: &signer) {
        // No initialization needed yet
    }

    // Dealer lists a vehicle
    public entry fun list_vehicle(account: &signer, id: u64, price: u64) {
        let dealer = signer::address_of(account);
        move_to(account, Vehicle { id, dealer, price, is_sold: false });
    }

    // Lender creates a loan offer
    public entry fun create_loan_offer(account: &signer, id: u64, amount: u64, interest_rate: u64, duration: u64) {
        let lender = signer::address_of(account);
        move_to(account, LoanOffer { id, lender, amount, interest_rate, duration, active: true });
    }

    // Customer applies for a loan
    public entry fun apply_for_loan(
        customer: &signer,
        lender: address,
        offer_id: u64,
        vehicle_id: u64
    ) acquires LoanOffer, Vehicle {
        let customer_addr = signer::address_of(customer);
        let offer = borrow_global_mut<LoanOffer>(lender);
        assert!(offer.active, 1);
        let vehicle = borrow_global_mut<Vehicle>(offer.lender);
        assert!(!vehicle.is_sold, 2);

        offer.active = false;
        vehicle.is_sold = true;

        let amount = offer.amount;
        let unlock_time = timestamp::now_seconds() + offer.duration;

        // Transfer loan amount to escrow (simplified for now)
        coin::transfer<AptosCoin>(customer, lender, amount);

        move_to(customer, Loan {
            offer_id,
            customer: customer_addr,
            vehicle_id,
            amount,
            repaid_amount: 0,
            unlock_time,
            in_escrow: true,
        });
    }

    // Repay loan (partial for simplicity)
    public entry fun repay_loan(customer: &signer, lender: address, amount: u64) acquires Loan {
        let customer_addr = signer::address_of(customer);
        let loan = borrow_global_mut<Loan>(customer_addr);
        assert!(loan.in_escrow, 3);
        loan.repaid_amount = loan.repaid_amount + amount;
        coin::transfer<AptosCoin>(customer, lender, amount);
        if (loan.repaid_amount >= loan.amount) {
            loan.in_escrow = false;
        }
    }

    // Default handling (fixed warning)
    public entry fun check_default(_account: &signer, customer: address) acquires Loan {
        let loan = borrow_global_mut<Loan>(customer);
        let now = timestamp::now_seconds();
        if (now > loan.unlock_time && loan.repaid_amount < loan.amount) {
            loan.in_escrow = false; // Collateral could be liquidated here
        }
    }
}