// ============================================
// SZAFAX + SUPABASE
// ============================================

const defaultProducts = [
  {
    id: "demo-1",
    name: "Bluza Oversize",
    price: 79.99,
    size: "M",
    category: "Bluzy",
    description: "Wygodna bluza oversize.",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80",
    created_at: new Date().toISOString()
  },
  {
    id: "demo-2",
    name: "Koszulka Basic",
    price: 39.99,
    size: "L",
    category: "Koszulki",
    description: "Prosta koszulka.",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    created_at: new Date(Date.now() - 1000).toISOString()
  }
];

let products = [];
let cart = JSON.parse(localStorage.getItem("szafax_cart") || "[]");

let selectedParcel = null;
let currentUser = null;


// ============================================
// START
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
  await checkUser();
  await loadProducts();

  updateCartCount();
  renderProducts();
});


// ============================================
// UŻYTKOWNIK
// ============================================

async function checkUser() {
  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase nie został załadowany.");
    return;
  }

  try {
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    currentUser = user || null;

    updateAccountButton();

  } catch (error) {
    console.error("Błąd sprawdzania użytkownika:", error);
  }
}


function updateAccountButton() {
  const accountLinks = document.querySelectorAll(
    'a[href="account.html"]'
  );

  accountLinks.forEach(link => {
    if (currentUser) {
      link.textContent = "Konto";
    } else {
      link.textContent = "Zaloguj";
    }
  });
}


// ============================================
// PRODUKTY Z SUPABASE
// ============================================

async function loadProducts() {

  try {

    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("is_available", true)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      console.error("Błąd pobierania produktów:", error);

      products = defaultProducts;
      renderProducts();

      return;
    }

    products = data.map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      size: p.size || "",
      category: p.category || "Inne",
      description: p.description || "",
      image: p.image_url || "",
      created_at: p.created_at,
      seller_id: p.seller_id
    }));

    // Jeżeli baza jest jeszcze pusta,
    // pokazujemy produkty demonstracyjne.
    if (!products.length) {
      products = defaultProducts;
    }

    renderProducts();

  } catch (error) {

    console.error(error);

    products = defaultProducts;

    renderProducts();
  }
}


// ============================================
// WYŚWIETLANIE PRODUKTÓW
// ============================================

function renderProducts() {

  const box = document.getElementById("products");

  if (!box) return;

  const search =
    (
      document.getElementById("search")?.value || ""
    ).toLowerCase();

  const category =
    document.getElementById("category")?.value || "";

  const sort =
    document.getElementById("sort")?.value || "new";

  let list = products.filter(p => {

    return (
      p.name.toLowerCase().includes(search) &&
      (!category || p.category === category)
    );

  });


  if (sort === "cheap") {
    list.sort((a, b) => a.price - b.price);
  }

  if (sort === "expensive") {
    list.sort((a, b) => b.price - a.price);
  }

  if (sort === "new") {
    list.sort(
      (a, b) =>
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0)
    );
  }


  if (!list.length) {

    box.innerHTML =
      `<p>Nie znaleziono produktów.</p>`;

    return;
  }


  box.innerHTML = list.map(p => `

    <article class="product">

      <img
        src="${escapeHTML(p.image)}"
        alt="${escapeHTML(p.name)}"
      >

      <div class="productInfo">

        <p class="small">
          ${escapeHTML(p.category)}
        </p>

        <h3>
          ${escapeHTML(p.name)}
        </h3>

        <p>
          Rozmiar:
          ${escapeHTML(p.size)}
        </p>

        <div class="price">
          ${Number(p.price).toFixed(2)} zł
        </div>

        <button onclick="openProduct('${p.id}')">
          Zobacz
        </button>

      </div>

    </article>

  `).join("");
}


// ============================================
// PRODUKT
// ============================================

function openProduct(id) {

  const p = products.find(
    x => String(x.id) === String(id)
  );

  if (!p) return;


  document.getElementById("productImage").src =
    p.image;

  document.getElementById("productCategory")
    .textContent = p.category;

  document.getElementById("productName")
    .textContent = p.name;

  document.getElementById("productPrice")
    .textContent =
      Number(p.price).toFixed(2) + " zł";

  document.getElementById("productSize")
    .textContent =
      "Rozmiar: " + p.size;

  document.getElementById("productDescription")
    .textContent =
      p.description || "";


  document.getElementById("addButton").onclick = () => {

    cart.push({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      size: p.size,
      category: p.category,
      image: p.image,
      seller_id: p.seller_id
    });

    saveCart();

    updateCartCount();

    closeModal("productModal");

  };


  openModal("productModal");
}


// ============================================
// KOSZYK
// ============================================

function saveCart() {

  localStorage.setItem(
    "szafax_cart",
    JSON.stringify(cart)
  );
}


function openCart() {

  renderCart();

  openModal("cartModal");
}


function renderCart() {

  const box =
    document.getElementById("cartItems");

  if (!box) return;


  if (!cart.length) {

    box.innerHTML =
      "<p>Koszyk jest pusty.</p>";

    document.getElementById("cartTotal")
      .textContent = "0,00 zł";

    return;
  }


  let total = 0;


  box.innerHTML = cart.map((p, index) => {

    total += Number(p.price);


    return `

      <div class="cartItem">

        <img
          src="${escapeHTML(p.image)}"
        >

        <div style="flex:1">

          <b>
            ${escapeHTML(p.name)}
          </b>

          <p>
            ${Number(p.price).toFixed(2)} zł
          </p>

          <button
            onclick="removeCart(${index})"
          >
            Usuń
          </button>

        </div>

      </div>

    `;

  }).join("");


  document.getElementById("cartTotal")
    .textContent =
      total.toFixed(2) + " zł";
}


function removeCart(index) {

  cart.splice(index, 1);

  saveCart();

  updateCartCount();

  renderCart();
}


function updateCartCount() {

  const counter =
    document.getElementById("cartCount");

  if (counter) {
    counter.textContent = cart.length;
  }
}


// ============================================
// CHECKOUT
// ============================================

function goCheckout() {

  if (!cart.length) {

    alert("Koszyk jest pusty.");

    return;
  }


  if (!currentUser) {

    alert(
      "Najpierw zaloguj się na swoje konto."
    );

    window.location.href = "account.html";

    return;
  }


  closeModal("cartModal");

  openModal("checkoutModal");
}


// ============================================
// PACZKOMAT
// ============================================

function chooseParcel() {

  // Na razie DEMO.
  // Prawdziwy picker InPost podłączymy później.

  const code = prompt(
    "Wpisz kod Paczkomatu, np. WAW123M:"
  );

  if (!code) return;


  selectedParcel =
    code.trim().toUpperCase();


  document.getElementById("parcelInfo")
    .innerHTML =
      "📦 Wybrany Paczkomat: <b>" +
      escapeHTML(selectedParcel) +
      "</b>";
}


// ============================================
// ZAMÓWIENIE
// ============================================

async function createOrder() {

  if (!cart.length) {

    alert("Koszyk jest pusty.");

    return;
  }


  if (!currentUser) {

    alert(
      "Musisz być zalogowany."
    );

    return;
  }


  const name =
    document
      .getElementById("buyerName")
      .value
      .trim();


  const email =
    document
      .getElementById("buyerEmail")
      .value
      .trim();


  const phone =
    document
      .getElementById("buyerPhone")
      .value
      .trim();


  if (!name || !email || !phone) {

    alert(
      "Uzupełnij wszystkie dane."
    );

    return;
  }


  if (!selectedParcel) {

    alert(
      "Wybierz Paczkomat."
    );

    return;
  }


  /*
    WAŻNE:

    Nie zapisujemy tutaj ceny
    bezpośrednio do bazy.

    Później create-order Edge Function
    pobierze ceny produktów z Supabase,
    sprawdzi ich dostępność,
    policzy całość i utworzy
    bezpieczne zamówienie.
  */


  try {

    const response =
      await fetch(
        `${SUPABASE_URL}/functions/v1/create-order`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            items: cart.map(item => ({
              product_id: item.id,
              quantity: 1
            })),

            buyer_name: name,
            buyer_email: email,
            buyer_phone: phone,

            parcel_machine:
              selectedParcel
          })
        }
      );


    const result =
      await response.json();


    if (!response.ok) {

      console.error(result);

      alert(
        result.error ||
        "Nie udało się utworzyć zamówienia."
      );

      return;
    }


    alert(
      "Zamówienie " +
      result.order_number +
      " zostało utworzone!"
    );


    cart = [];

    saveCart();

    updateCartCount();

    selectedParcel = null;

    closeModal(
      "checkoutModal"
    );


  } catch (error) {

    console.error(error);

    alert(
      "Nie można połączyć się z serwerem."
    );
  }
}


// ============================================
// DODAWANIE PRODUKTU
// ============================================

function openAddProduct() {

  if (!currentUser) {

    alert(
      "Musisz być zalogowany, żeby sprzedawać."
    );

    window.location.href =
      "account.html";

    return;
  }


  openModal("addModal");
}


async function addProduct() {

  if (!currentUser) {

    alert(
      "Musisz być zalogowany."
    );

    return;
  }


  const name =
    document
      .getElementById("newName")
      .value
      .trim();


  const price =
    Number(
      document
        .getElementById("newPrice")
        .value
    );


  const size =
    document
      .getElementById("newSize")
      .value
      .trim();


  const category =
    document
      .getElementById("newCategory")
      .value;


  const description =
    document
      .getElementById("newDescription")
      .value
      .trim();


  const file =
    document
      .getElementById("newImage")
      .files[0];


  if (
    !name ||
    !price ||
    !size ||
    !file
  ) {

    alert(
      "Uzupełnij wymagane pola."
    );

    return;
  }


  /*
    Na tym etapie wykorzystujemy
    lokalny adres obrazka.

    Prawdziwe uploadowanie zdjęć
    do Supabase Storage podłączymy
    jako następny krok.
  */

  const reader =
    new FileReader();


  reader.onload = async () => {

    const imageUrl =
      reader.result;


    const {
      data,
      error
    } = await supabaseClient
      .from("products")
      .insert({

        seller_id:
          currentUser.id,

        name,

        description,

        price,

        size,

        category,

        image_url:
          imageUrl,

        is_available:
          true

      })
      .select()
      .single();


    if (error) {

      console.error(error);

      alert(
        "Nie udało się dodać produktu:\n" +
        error.message
      );

      return;
    }


    products.unshift({

      id: data.id,

      name: data.name,

      price:
        Number(data.price),

      size:
        data.size,

      category:
        data.category,

      description:
        data.description,

      image:
        data.image_url,

      created_at:
        data.created_at,

      seller_id:
        data.seller_id
    });


    renderProducts();

    closeModal(
      "addModal"
    );


    document
      .getElementById("newName")
      .value = "";

    document
      .getElementById("newPrice")
      .value = "";

    document
      .getElementById("newSize")
      .value = "";

    document
      .getElementById("newDescription")
      .value = "";

    document
      .getElementById("newImage")
      .value = "";


    alert(
      "Ubranie zostało wystawione! 🛍️"
    );
  };


  reader.readAsDataURL(file);
}


// ============================================
// KATEGORIE
// ============================================

function chooseCategory(category) {

  const select =
    document.getElementById(
      "category"
    );

  if (select) {
    select.value = category;
  }


  document
    .getElementById("shop")
    .scrollIntoView();


  renderProducts();
}


// ============================================
// MODALE
// ============================================

function openModal(id) {

  const modal =
    document.getElementById(id);

  if (modal) {
    modal.style.display =
      "flex";
  }
}


function closeModal(id) {

  const modal =
    document.getElementById(id);

  if (modal) {
    modal.style.display =
      "none";
  }
}


// ============================================
// ESCAPE HTML
// ============================================

function escapeHTML(value) {

  return String(value ?? "")

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );
    }
