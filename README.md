# AutoLending

## Overview
AutoLending is a decentralized vehicle financing platform built on the Aptos blockchain using Move smart contracts. This project enables dealers to list vehicles, lenders to create loan offers, and customers to apply for and repay loans for vehicle purchases. The frontend is a React application that interacts with the Aptos blockchain via the Petra Wallet, providing a user-friendly interface for managing these transactions.

The project includes:
- A Move smart contract (`AutoLending.move`) deployed on the Aptos testnet.
- A React-based frontend for interacting with the contract.
- Git version control for managing the codebase.

## Features
- **Vehicle Listing**: Dealers can list vehicles with IDs and prices in APT (Aptos tokens).
- **Loan Offers**: Lenders can create loan offers with amounts, interest rates, and durations.
- **Loan Applications**: Customers can apply for loans using lender offers and vehicle IDs.
- **Loan Repayment**: Customers can repay loans partially or fully.
- **Default Checking**: Check if a customer’s loan is in default based on the loan duration.
- **Vehicle Querying**: View listed vehicles by dealer address.

## Prerequisites
Before setting up the project, ensure you have the following installed:
- **Node.js** (v16.x or higher recommended)
- **npm** (or Yarn)
- **Aptos CLI** (for deploying and interacting with the Move contract)
- **Petra Wallet** (browser extension for interacting with the Aptos testnet)
- **Git** (for version control)

## Installation

### 1. Clone the Repository
Clone this repository to your local machine:
```bash
git clone https://github.com/Quadwinner/AutoLending.git
cd AutoLending


curl -fsSL https://aptos.dev/install-cli | bash
aptos --version

aptos init --profile testnet --network testnet

[package]
name = "AutoLending"
version = "0.0.1"

[addresses]
AutoLending = "0x03f4fe0fa07e8733ca0eb08be6d46e8ae929afdc33222164d79f5cdc89137970"

[dependencies]
AptosFramework = { git = "https://github.com/aptos-labs/aptos-core.git", rev = "mainnet" }


[compile and publish the contract]

aptos move compile --package-dir .
aptos move publish --package-dir . --profile testnet

[set Up the Frontend]
cd frontend
npm install react react-dom @aptos-labs/ts-sdk
npm run dev

[Project Structure]
AutoLending/
├── README.md
├── .gitignore
├── Move.toml
├── sources/
│   └── AutoLending.move
└── frontend/
    ├── src/
    │   └── App.jsx
    ├── package.json
    └── ...