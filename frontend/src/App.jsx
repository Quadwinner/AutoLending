import React, { useState, useEffect } from "react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

const aptosConfig = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(aptosConfig);
const MODULE_ADDRESS = "0x03f4fe0fa07e8733ca0eb08be6d46e8ae929afdc33222164d79f5cdc89137970";

function App() {
  const [account, setAccount] = useState(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("dealer");
  const [loading, setLoading] = useState(false);

  // Dealer state
  const [vehicleId, setVehicleId] = useState("1");
  const [vehiclePrice, setVehiclePrice] = useState("100");

  // Lender state
  const [loanId, setLoanId] = useState("1");
  const [loanAmount, setLoanAmount] = useState("50");
  const [interestRate, setInterestRate] = useState("500"); // 5% = 500
  const [loanDuration, setLoanDuration] = useState("3600"); // 1 hour

  // Customer state
  const [applyLender, setApplyLender] = useState("");
  const [applyOfferId, setApplyOfferId] = useState("1");
  const [applyVehicleId, setApplyVehicleId] = useState("1");

  // Repayment state
  const [repayLender, setRepayLender] = useState("");
  const [repayAmount, setRepayAmount] = useState("10");

  // Vehicle listing state
  const [vehicles, setVehicles] = useState([]);
  const [dealerAddress, setDealerAddress] = useState(""); // Input for querying vehicles
  const [customerAddress, setCustomerAddress] = useState(""); // For checking defaults

  // Check if wallet is already connected on load
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.aptos) {
        try {
          const { address } = await window.aptos.account();
          if (address) {
            setAccount(address);
            setMessage("Wallet connected");
            await ensureCoinRegistration(address); // Ensure AptosCoin is registered
          }
        } catch (error) {
          console.log("Not connected yet");
        }
      }
    };
    checkWalletConnection();
  }, []);

  // Fetch vehicles when dealerAddress changes or on initial load
  useEffect(() => {
    if (dealerAddress) {
      fetchVehicles();
    }
  }, [dealerAddress]);

  // Ensure AptosCoin registration for the account
  const ensureCoinRegistration = async (address) => {
    try {
      const resources = await aptos.getAccountResources({ accountAddress: address });
      const hasCoinStore = resources.some(
        (resource) => resource.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
      );
      if (!hasCoinStore) {
        const payload = {
          function: "0x1::coin::register",
          type_arguments: ["0x1::aptos_coin::AptosCoin"],
          arguments: [],
        };
        await window.aptos.signAndSubmitTransaction(payload);
        setMessage("AptosCoin registered successfully!");
      }
    } catch (error) {
      setMessage("Failed to register AptosCoin: " + (error.message || error));
    }
  };

  // Connect to Petra Wallet
  const connectWallet = async () => {
    if (window.aptos) {
      try {
        setLoading(true);
        const response = await window.aptos.connect();
        setAccount(response.address);
        setMessage("Wallet connected successfully!");
        await ensureCoinRegistration(response.address); // Register AptosCoin
        setLoading(false);
      } catch (error) {
        setMessage("Failed to connect: " + (error.message || error));
        setLoading(false);
      }
    } else {
      setMessage("Please install Petra Wallet!");
    }
  };

  // Initialize module (optional, not strictly necessary)
  const initializeModule = async () => {
    if (!account) {
      setMessage("Connect wallet first!");
      return;
    }

    try {
      setLoading(true);
      setMessage("Initializing module...");

      const payload = {
        function: `${MODULE_ADDRESS}::AutoLending::initialize`,
        type_arguments: [],
        arguments: [],
      };

      const response = await window.aptos.signAndSubmitTransaction(payload);
      await aptos.waitForTransaction({ transactionHash: response.hash });

      setMessage("Module initialized successfully! Tx: " + shortenHash(response.hash));
      setLoading(false);
    } catch (error) {
      setMessage("Initialization failed: " + (error.message || error));
      setLoading(false);
    }
  };

  // Dealer: List a vehicle
  const listVehicle = async () => {
    if (!account) {
      setMessage("Connect wallet first!");
      return;
    }

    if (!vehicleId || isNaN(vehicleId) || parseInt(vehicleId) <= 0) {
      setMessage("Invalid Vehicle ID (must be a positive number)");
      return;
    }
    if (!vehiclePrice || isNaN(vehiclePrice) || parseInt(vehiclePrice) <= 0) {
      setMessage("Invalid Vehicle Price (must be a positive number)");
      return;
    }

    try {
      setLoading(true);
      setMessage("Processing transaction...");

      const payload = {
        function: `${MODULE_ADDRESS}::AutoLending::list_vehicle`,
        type_arguments: [],
        arguments: [parseInt(vehicleId), parseInt(vehiclePrice)],
      };

      const response = await window.aptos.signAndSubmitTransaction(payload);
      await aptos.waitForTransaction({ transactionHash: response.hash });

      setMessage(`Vehicle ID ${vehicleId} listed successfully! Tx: ${shortenHash(response.hash)}`);
      setLoading(false);
      if (dealerAddress === account) fetchVehicles();
    } catch (error) {
      setMessage("Listing failed: " + (error.message || error));
      setLoading(false);
    }
  };

  // Lender: Create a loan offer
  const createLoanOffer = async () => {
    if (!account) {
      setMessage("Connect wallet first!");
      return;
    }

    if (!loanId || isNaN(loanId) || parseInt(loanId) <= 0) {
      setMessage("Invalid Loan ID (must be a positive number)");
      return;
    }
    if (!loanAmount || isNaN(loanAmount) || parseInt(loanAmount) <= 0) {
      setMessage("Invalid Loan Amount (must be a positive number)");
      return;
    }
    if (!interestRate || isNaN(interestRate) || parseInt(interestRate) <= 0) {
      setMessage("Invalid Interest Rate (must be a positive number, e.g., 500 for 5%)");
      return;
    }
    if (!loanDuration || isNaN(loanDuration) || parseInt(loanDuration) <= 0) {
      setMessage("Invalid Loan Duration (must be a positive number in seconds)");
      return;
    }

    try {
      setLoading(true);
      setMessage("Processing transaction...");

      const payload = {
        function: `${MODULE_ADDRESS}::AutoLending::create_loan_offer`,
        type_arguments: [],
        arguments: [parseInt(loanId), parseInt(loanAmount), parseInt(interestRate), parseInt(loanDuration)],
      };

      const response = await window.aptos.signAndSubmitTransaction(payload);
      await aptos.waitForTransaction({ transactionHash: response.hash });

      setMessage(`Loan offer ID ${loanId} created! Tx: ${shortenHash(response.hash)}`);
      setLoading(false);
    } catch (error) {
      setMessage("Creating offer failed: " + (error.message || error));
      setLoading(false);
    }
  };

  // Customer: Apply for a loan
  const applyForLoan = async () => {
    if (!account) {
      setMessage("Connect wallet first!");
      return;
    }

    if (!applyLender) {
      setMessage("Enter lender address!");
      return;
    }
    if (!applyOfferId || isNaN(applyOfferId) || parseInt(applyOfferId) <= 0) {
      setMessage("Invalid Loan Offer ID (must be a positive number)");
      return;
    }
    if (!applyVehicleId || isNaN(applyVehicleId) || parseInt(applyVehicleId) <= 0) {
      setMessage("Invalid Vehicle ID (must be a positive number)");
      return;
    }

    try {
      setLoading(true);
      setMessage("Processing transaction...");

      const payload = {
        function: `${MODULE_ADDRESS}::AutoLending::apply_for_loan`,
        type_arguments: [],
        arguments: [applyLender, parseInt(applyOfferId), parseInt(applyVehicleId)],
      };

      const response = await window.aptos.signAndSubmitTransaction(payload);
      await aptos.waitForTransaction({ transactionHash: response.hash });

      setMessage(`Loan application successful! Tx: ${shortenHash(response.hash)}`);
      setLoading(false);
      if (dealerAddress) fetchVehicles(); // Refresh vehicle list
    } catch (error) {
      setMessage("Loan application failed: " + (error.message || error));
      setLoading(false);
    }
  };

  // Repay a loan
  const repayLoan = async () => {
    if (!account) {
      setMessage("Connect wallet first!");
      return;
    }

    if (!repayLender) {
      setMessage("Enter lender address!");
      return;
    }
    if (!repayAmount || isNaN(repayAmount) || parseInt(repayAmount) <= 0) {
      setMessage("Invalid Repayment Amount (must be a positive number)");
      return;
    }

    try {
      setLoading(true);
      setMessage("Processing transaction...");

      const payload = {
        function: `${MODULE_ADDRESS}::AutoLending::repay_loan`,
        type_arguments: [],
        arguments: [repayLender, parseInt(repayAmount)],
      };

      const response = await window.aptos.signAndSubmitTransaction(payload);
      await aptos.waitForTransaction({ transactionHash: response.hash });

      setMessage(`Loan repayment of ${repayAmount} APT successful! Tx: ${shortenHash(response.hash)}`);
      setLoading(false);
    } catch (error) {
      setMessage("Loan repayment failed: " + (error.message || error));
      setLoading(false);
    }
  };

  // Check loan default for a customer
  const checkDefault = async () => {
    if (!customerAddress) {
      setMessage("Enter a customer address to check defaults!");
      return;
    }

    try {
      setLoading(true);
      setMessage("Checking loan default...");

      const payload = {
        function: `${MODULE_ADDRESS}::AutoLending::check_default`,
        type_arguments: [],
        arguments: [customerAddress],
      };

      const response = await window.aptos.signAndSubmitTransaction(payload);
      await aptos.waitForTransaction({ transactionHash: response.hash });

      setMessage(`Checked default for customer ${shortenAddress(customerAddress)}. Tx: ${shortenHash(response.hash)}`);
      setLoading(false);
    } catch (error) {
      setMessage("Checking default failed: " + (error.message || error));
      setLoading(false);
    }
  };

  // Fetch listed vehicles from a dealer's address
  const fetchVehicles = async () => {
    if (!dealerAddress) {
      setMessage("Enter a dealer address to fetch vehicles!");
      return;
    }

    try {
      setLoading(true);
      setMessage("Fetching vehicles...");

      const resource = await aptos.getAccountResource({
        accountAddress: dealerAddress,
        resourceType: `${MODULE_ADDRESS}::AutoLending::Vehicle`,
      });

      setVehicles([{
        id: resource.id,
        dealer: resource.dealer,
        price: resource.price,
        is_sold: resource.is_sold,
      }]);
      setMessage("Vehicles fetched successfully!");
      setLoading(false);
    } catch (error) {
      console.error(error);
      setMessage("Failed to fetch vehicles: " + (error.message || "No vehicles found at this address"));
      setVehicles([]);
      setLoading(false);
    }
  };

  // Helper to shorten transaction hash for display
  const shortenHash = (hash) => {
    if (!hash) return "";
    return hash.substring(0, 8) + "..." + hash.substring(hash.length - 4);
  };

  // Helper to shorten address for display
  const shortenAddress = (address) => {
    if (!address) return "";
    return address.substring(0, 6) + "..." + address.substring(address.length - 4);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-gray-900/80 backdrop-blur-lg shadow-2xl rounded-2xl p-8 w-full max-w-5xl border border-indigo-500/30">
        <header className="mb-8">
          <h1 className="text-5xl font-bold text-white text-center mb-4 drop-shadow-lg">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400">
              Aptos Auto Lending
            </span>
          </h1>
          <p className="text-indigo-200 text-center opacity-80">Decentralized vehicle financing on the Aptos blockchain</p>
        </header>

        {/* Wallet Connection */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div>
            {account ? (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                <p className="text-white">
                  Connected: <span className="text-indigo-300 font-mono">{shortenAddress(account)}</span>
                </p>
              </div>
            ) : (
              <p className="text-gray-400">Wallet not connected</p>
            )}
          </div>

          <button
            onClick={connectWallet}
            disabled={loading}
            className={`px-6 py-3 rounded-xl ${
              account ? "bg-indigo-800 text-indigo-200" : "bg-gradient-to-r from-indigo-600 to-blue-600 text-white"
            } hover:from-indigo-700 hover:to-blue-700 shadow-lg transition-all duration-300 flex items-center gap-2 disabled:opacity-70`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : account ? (
              "Wallet Connected"
            ) : (
              "Connect Petra Wallet"
            )}
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 text-center ${
            message.includes("failed") || message.includes("Failed")
              ? "bg-red-900/50 text-red-200 border border-red-700/50"
              : "bg-green-900/30 text-green-200 border border-green-700/30"
          }`}>
            {message}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap border-b border-indigo-900/50 mb-6">
          <button
            onClick={() => setActiveTab("dealer")}
            className={`px-6 py-3 font-medium ${
              activeTab === "dealer"
                ? "text-white border-b-2 border-indigo-500"
                : "text-indigo-300 hover:text-white"
            }`}
          >
            Dealer
          </button>
          <button
            onClick={() => setActiveTab("lender")}
            className={`px-6 py-3 font-medium ${
              activeTab === "lender"
                ? "text-white border-b-2 border-indigo-500"
                : "text-indigo-300 hover:text-white"
            }`}
          >
            Lender
          </button>
          <button
            onClick={() => setActiveTab("customer")}
            className={`px-6 py-3 font-medium ${
              activeTab === "customer"
                ? "text-white border-b-2 border-indigo-500"
                : "text-indigo-300 hover:text-white"
            }`}
          >
            Customer
          </button>
          <button
            onClick={() => setActiveTab("repay")}
            className={`px-6 py-3 font-medium ${
              activeTab === "repay"
                ? "text-white border-b-2 border-indigo-500"
                : "text-indigo-300 hover:text-white"
            }`}
          >
            Repayment
          </button>
          <button
            onClick={() => setActiveTab("vehicles")}
            className={`px-6 py-3 font-medium ${
              activeTab === "vehicles"
                ? "text-white border-b-2 border-indigo-500"
                : "text-indigo-300 hover:text-white"
            }`}
          >
            Vehicles
          </button>
          <button
            onClick={() => setActiveTab("default")}
            className={`px-6 py-3 font-medium ${
              activeTab === "default"
                ? "text-white border-b-2 border-indigo-500"
                : "text-indigo-300 hover:text-white"
            }`}
          >
            Check Default
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800/50 rounded-xl border border-indigo-900/50 overflow-hidden">
          {/* Dealer Tab */}
          {activeTab === "dealer" && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-teal-900/50 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-teal-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">List a Vehicle</h2>
                  <p className="text-indigo-300 text-sm">Register a vehicle for financing</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-indigo-200 mb-2 text-sm">Vehicle ID</label>
                  <input
                    type="number"
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full bg-gray-800/70 border border-indigo-900/50 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter vehicle ID"
                  />
                </div>

                <div>
                  <label className="block text-indigo-200 mb-2 text-sm">Price (APT)</label>
                  <input
                    type="number"
                    value={vehiclePrice}
                    onChange={(e) => setVehiclePrice(e.target.value)}
                    className="w-full bg-gray-800/70 border border-indigo-900/50 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter price in APT"
                  />
                </div>
              </div>

              <button
                onClick={listVehicle}
                disabled={loading || !account}
                className="mt-6 w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-3 rounded-lg hover:from-teal-700 hover:to-emerald-700 transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "List Vehicle"
                )}
              </button>
            </div>
          )}

          {/* Lender Tab */}
          {activeTab === "lender" && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-amber-900/50 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-amber-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Create Loan Offer</h2>
                  <p className="text-indigo-300 text-sm">Provide financing for vehicle purchases</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-indigo-200 mb-2 text-sm">Loan ID</label>
                  <input
                    type="number"
                    value={loanId}
                    onChange={(e) => setLoanId(e.target.value)}
                    className="w-full bg-gray-800/70 border border-indigo-900/50 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter loan ID"
                  />
                </div>

                <div>
                  <label className="block text-indigo-200 mb-2 text-sm">Loan Amount (APT)</label>
                  <input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full bg-gray-800/70 border border-indigo-900/50 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter loan amount in APT"
                  />
                </div>

                <div>
                  <label className="block text-indigo-200 mb-2 text-sm">Interest Rate (500 = 5%)</label>
                  <input
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full bg-gray-800/70 border border-indigo-900/50 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter interest rate (e.g., 500 for 5%)"
                  />
                  <p className="text-indigo-300 text-xs mt-1">
                    Current rate: {(parseInt(interestRate) / 100).toFixed(2)}%
                  </p>
                </div>

                <div>
                  <label className="block text-indigo-200 mb-2 text-sm">Duration (seconds)</label>
                  <input
                    type="number"
                    value={loanDuration}
                    onChange={(e) => setLoanDuration(e.target.value)}
                    className="w-full bg-gray-800/70 border border-indigo-900/50 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter duration in seconds"
                  />
                  <p className="text-indigo-300 text-xs mt-1">
                    {parseInt(loanDuration) < 60
                      ? `${loanDuration} seconds`
                      : parseInt(loanDuration) < 3600
                        ? `${Math.floor(parseInt(loanDuration) / 60)} minutes`
                        : `${Math.floor(parseInt(loanDuration) / 3600)} hours`}
                  </p>
                </div>
              </div>

              <button
                onClick={createLoanOffer}
                disabled={loading || !account}
                className="mt-6 w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white p-3 rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Create Loan Offer"
                )}
              </button>
            </div>
          )}

          {/* Customer Tab */}
          {activeTab === "customer" && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-purple-900/50 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Apply for Loan</h2>
                  <p className="text-indigo-300 text-sm">Get financing for your vehicle purchase</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-indigo-200 mb-2 text-sm">Lender Address</label>
                  <input
                    type="text"
                    value={applyLender}
                    onChange={(e) => setApplyLender(e.target.value)}
                    placeholder="Enter lender address (0x...)"
                    className="w-full bg-gray-800/70 border border-indigo-900/50 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-indigo-200 mb-2 text-sm">Loan Offer ID</label>
                    <input
                      type="number"
                      value={applyOfferId}
                      onChange={(e) => setApplyOfferId(e.target.value)}
                      className="w-full bg-gray-800/70 border border-indigo-900/50 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter loan offer ID"
                    />
                  </div>

                  <div>
                    <label className="block text-indigo-200 mb-2 text-sm">Vehicle ID</label>
                    <input
                      type="number"
                      value={applyVehicleId}
                      onChange={(e) => setApplyVehicleId(e.target.value)}
                      className="w-full bg-gray-800/70 border border-indigo-900/50 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter vehicle ID"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={applyForLoan}
                disabled={loading || !account || !applyLender}
                className="mt-6 w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Apply for Loan"
                )}
              </button>
            </div>
          )}

          {/* Repayment Tab */}
          {activeTab === "repay" && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-900/50 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Repay Loan</h2>
                  <p className="text-indigo-300 text-sm">Make payments on your active loan</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-indigo-200 mb-2 text-sm">Lender Address</label>
                  <input
                    type="text"
                    value={repayLender}
                    onChange={(e) => setRepayLender(e.target.value)}
                    placeholder="Enter lender address (0x...)"
                    className="w-full bg-gray-800/70 border border-indigo-900/50 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-indigo-200 mb-2 text-sm">Repayment Amount (APT)</label>
                  <input
                    type="number"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    className="w-full bg-gray-800/70 border border-indigo-900/50 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter repayment amount in APT"
                  />
                </div>
              </div>

              <button
                onClick={repayLoan}
                disabled={loading || !account || !repayLender}
                className="mt-6 w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Make Payment"
                )}
              </button>
            </div>
          )}

          {/* Vehicles Tab */}
          {activeTab === "vehicles" && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-green-900/50 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17V9m0 0H5m4 0h4m4 8V9m0 0h-4m4 0h4M5 9H3m14 0h2m-8 8v2m-4-2H3m14 0h2"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Listed Vehicles</h2>
                  <p className="text-indigo-300 text-sm">View vehicles available for financing</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-indigo-200 mb-2 text-sm">Dealer Address</label>
                <input
                  type="text"
                  value={dealerAddress}
                  onChange={(e) => setDealerAddress(e.target.value)}
                  placeholder="Enter dealer address (0x...)"
                  className="w-full bg-gray-800/70 border border-indigo-900/50 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                />
                <button
                  onClick={fetchVehicles}
                  disabled={loading || !dealerAddress}
                  className="mt-4 w-full bg-gradient-to-r from-green-600 to-teal-600 text-white p-3 rounded-lg hover:from-green-700 hover:to-teal-700 transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Fetching...
                    </>
                  ) : (
                    "Fetch Vehicles"
                  )}
                </button>
              </div>

              {vehicles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="bg-gray-900/70 p-4 rounded-lg border border-indigo-900/50"
                    >
                      <h3 className="text-lg font-semibold text-white">Vehicle ID: {vehicle.id}</h3>
                      <p className="text-indigo-200 text-sm">
                        Dealer: <span className="font-mono">{shortenAddress(vehicle.dealer)}</span>
                      </p>
                      <p className="text-indigo-200 text-sm">Price: {vehicle.price} APT</p>
                      <p className="text-indigo-200 text-sm">
                        Status: {vehicle.is_sold ? "Sold" : "Available"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-indigo-300 text-center">No vehicles listed yet.</p>
              )}
            </div>
          )}

          {/* Check Default Tab */}
          {activeTab === "default" && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Check Loan Default</h2>
                  <p className="text-indigo-300 text-sm">Check if a customer’s loan is in default</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-indigo-200 mb-2 text-sm">Customer Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Enter customer address (0x...)"
                  className="w-full bg-gray-800/70 border border-indigo-900/50 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                />
                <button
                  onClick={checkDefault}
                  disabled={loading || !customerAddress}
                  className="mt-4 w-full bg-gradient-to-r from-red-600 to-rose-600 text-white p-3 rounded-lg hover:from-red-700 hover:to-rose-700 transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Checking...
                    </>
                  ) : (
                    "Check Default"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-indigo-200 text-sm opacity-70">
          <p>Powered by Aptos Blockchain • Move Smart Contracts</p>
          <div className="mt-2 flex justify-center space-x-3">
            <a
              href="https://aptos.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors duration-200"
            >
              Docs
            </a>
            <span>•</span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors duration-200"
            >
              GitHub
            </a>
            <span>•</span>
            <a
              href="#"
              className="hover:text-white transition-colors duration-200"
            >
              Support
            </a>
          </div>
          <p className="mt-2">© 2025 Aptos Auto Lending</p>
        </footer>
      </div>
    </div>
  );
}

export default App;