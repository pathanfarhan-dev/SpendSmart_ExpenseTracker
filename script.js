
/* =====================================
   SpendSmart - Expense Tracker
   JavaScript Functionality
===================================== */

// Select HTML elements
const transactionForm = document.getElementById("transactionForm");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("transactionDate");

const balanceDisplay = document.getElementById("balance");
const incomeDisplay = document.getElementById("income");
const expensesDisplay = document.getElementById("expenses");
const transactionList = document.getElementById("transactionList");
const transactionCount = document.getElementById("transactionCount");

const searchInput = document.getElementById("search");
const filterType = document.getElementById("filterType");
const filterCategory = document.getElementById("filterCategory");

const formTitle = document.getElementById("formTitle");
const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEdit");
const todayDate = document.getElementById("todayDate");

// Store transaction data in an array
const STORAGE_KEY = "spendsmart_transactions";

let transactions = [];
let editingId = null;

// Load previously saved data
try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const parsedData = savedData ? JSON.parse(savedData) : [];

    if (Array.isArray(parsedData)) {
        transactions = parsedData.filter(item =>
            item &&
            typeof item.id === "string" &&
            typeof item.description === "string" &&
            typeof item.amount === "number" &&
            Number.isFinite(item.amount) &&
            item.amount > 0 &&
            ["income", "expense"].includes(item.type) &&
            typeof item.category === "string" &&
            typeof item.date === "string"
        );
    }
} catch (error) {
    console.error("Could not load saved transactions:", error);
    transactions = [];
}

// Get today's date in local time
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

dateInput.value = getTodayDate();
todayDate.textContent = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
});

// Save transactions in browser storage
function saveTransactions() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        return true;
    } catch (error) {
        alert("Unable to save data. Check your browser storage.");
        console.error("Storage error:", error);
        return false;
    }
}

// Format amounts as Indian Rupees
function formatMoney(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Update the financial dashboard
function updateDashboard() {
    const totalIncome = transactions
        .filter(item => item.type === "income")
        .reduce((total, item) => total + item.amount, 0);

    const totalExpenses = transactions
        .filter(item => item.type === "expense")
        .reduce((total, item) => total + item.amount, 0);

    const balance = totalIncome - totalExpenses;

    incomeDisplay.textContent = formatMoney(totalIncome);
    expensesDisplay.textContent = formatMoney(totalExpenses);
    balanceDisplay.textContent = formatMoney(balance);

    // Show negative balance in red
    balanceDisplay.style.color =
        balance < 0 ? "#ffe0e3" : "#ffffff";
}

// Display transactions on the page
function renderTransactions() {
    transactionList.replaceChildren();

    // Search and filter transactions
    const searchText = searchInput.value.trim().toLowerCase();

    const filteredTransactions = transactions
        .filter(item => {
            const matchesSearch =
                item.description.toLowerCase().includes(searchText);

            const matchesType =
                filterType.value === "all" ||
                item.type === filterType.value;

            const matchesCategory =
                filterCategory.value === "all" ||
                item.category === filterCategory.value;

            return matchesSearch && matchesType && matchesCategory;
        })
        .sort((a, b) => {
            return b.date.localeCompare(a.date) ||
                b.id.localeCompare(a.id);
        });

    transactionCount.textContent =
        `${filteredTransactions.length} of ${transactions.length} transactions`;

    // Show a message when no records match
    if (filteredTransactions.length === 0) {
        const message = document.createElement("p");
        message.className = "empty-message";
        message.textContent = transactions.length === 0
            ? "No transactions yet. Add your first one!"
            : "No matching transactions found.";

        transactionList.appendChild(message);
        return;
    }

    // Create a card for each transaction
    filteredTransactions.forEach(item => {
        const card = document.createElement("div");
        card.className = "transaction-item";

        const info = document.createElement("div");
        info.className = "transaction-info";

        const title = document.createElement("h3");
        title.textContent = item.description;

        const details = document.createElement("p");
        details.textContent =
            `${item.category} • ${item.date} • ` +
            `${item.type === "income" ? "Income" : "Expense"}`;

        info.append(title, details);

        const rightSide = document.createElement("div");
        rightSide.className = "transaction-right";

        const amount = document.createElement("span");
        amount.className = `transaction-amount ${item.type}`;

        amount.textContent =
            `${item.type === "income" ? "+" : "−"}${formatMoney(item.amount)}`;

        const actions = document.createElement("div");
        actions.className = "transaction-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "edit-button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editTransaction(item.id));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteTransaction(item.id));

        actions.append(editButton, deleteButton);
        rightSide.append(amount, actions);
        card.append(info, rightSide);

        transactionList.appendChild(card);
    });
}

// Add a new transaction
transactionForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const description = descriptionInput.value.trim();
    const amount = Number(amountInput.value);
    const type = typeInput.value;
    const category = categoryInput.value;
    const date = dateInput.value;

    // Validate input
    if (!description || description.length > 80) {
        alert("Enter a description of up to 80 characters.");
        descriptionInput.focus();
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Enter an amount greater than zero.");
        amountInput.focus();
        return;
    }

    if (!["income", "expense"].includes(type)) {
        alert("Please select a valid transaction type.");
        return;
    }

    const allowedCategories = [
        "Food", "Travel", "Education", "Shopping",
        "Bills", "Salary", "Other"
    ];

    if (!allowedCategories.includes(category)) {
        alert("Please select a valid category.");
        return;
    }

    if (!date || date > getTodayDate()) {
        alert("Select a valid date that is not in the future.");
        dateInput.focus();
        return;
    }

    // Prepare the transaction object
    const transaction = {
        id: editingId || (
            Date.now().toString() + "-" +
            Math.random().toString(36).slice(2, 9)
        ),
        description,
        amount,
        type,
        category,
        date
    };

    const previousTransactions = [...transactions];

    if (editingId) {
        transactions = transactions.map(item =>
            item.id === editingId ? transaction : item
        );
    } else {
        transactions.push(transaction);
    }

    // Roll back changes if saving fails
    if (!saveTransactions()) {
        transactions = previousTransactions;
        return;
    }

    resetForm();
    refreshApp();
});

// Edit an existing transaction
function editTransaction(id) {
    const item = transactions.find(transaction => transaction.id === id);

    if (!item) return;

    editingId = id;

    descriptionInput.value = item.description;
    amountInput.value = item.amount;
    typeInput.value = item.type;
    categoryInput.value = item.category;
    dateInput.value = item.date;

    formTitle.textContent = "Edit Transaction";
    submitButton.textContent = "Save Changes";
    cancelEditButton.hidden = false;

    transactionForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    descriptionInput.focus();
}

// Delete a transaction
function deleteTransaction(id) {
    const item = transactions.find(transaction => transaction.id === id);

    if (!item) return;

    const confirmed = confirm(
        `Delete "${item.description}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    const previousTransactions = [...transactions];

    transactions = transactions.filter(item => item.id !== id);

    if (!saveTransactions()) {
        transactions = previousTransactions;
        return;
    }

    if (editingId === id) {
        resetForm();
    }

    refreshApp();
}

// Reset the form after saving or cancelling
function resetForm() {
    transactionForm.reset();
    editingId = null;

    dateInput.value = getTodayDate();

    formTitle.textContent = "Add Transaction";
    submitButton.textContent = "+ Add Transaction";
    cancelEditButton.hidden = true;
}

// Cancel editing
cancelEditButton.addEventListener("click", resetForm);

// Update results whenever search or filters change
searchInput.addEventListener("input", renderTransactions);
filterType.addEventListener("change", renderTransactions);
filterCategory.addEventListener("change", renderTransactions);

// Refresh the dashboard and transaction list
function refreshApp() {
    updateDashboard();
    renderTransactions();
}

// Display saved transactions when the page opens
refreshApp();
