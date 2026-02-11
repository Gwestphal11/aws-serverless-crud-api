
const API_URL = "https://z9wm2e2c80.execute-api.us-east-1.amazonaws.com/prod";

// Load all items
async function loadItems() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`Failed to fetch items: ${res.status}`);
    const items = await res.json();

    const list = document.getElementById("itemList");
    list.innerHTML = "";

    items.forEach(item => {
      const li = document.createElement("li");
      li.textContent = `${item.id}: ${item.message}`;

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "deleteBtn";
      deleteBtn.onclick = () => deleteItem(item.id);

      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading items:", err);
  }
}

// Add a new item
async function addItem() {
  const input = document.getElementById("itemInput");
  const message = input.value.trim();
  if (!message) return;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to add item: ${text}`);
    }

    input.value = "";
    loadItems();
  } catch (err) {
    console.error("Error adding item:", err);
  }
}

// Delete an item
async function deleteItem(id) {
  try {
    const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to delete item: ${text}`);
    }
    loadItems();
  } catch (err) {
    console.error("Error deleting item:", err);
  }
}

// Event listener for button
document.getElementById("addItemBtn").addEventListener("click", addItem);

// Load items on page load
loadItems();
