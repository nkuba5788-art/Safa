const defaultProducts = [
  {
    id:1,
    name:"Bluza Oversize",
    price:79.99,
    size:"M",
    category:"Bluzy",
    description:"Wygodna bluza oversize.",
    image:"https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80",
    created:Date.now()
  },
  {
    id:2,
    name:"Koszulka Basic",
    price:39.99,
    size:"L",
    category:"Koszulki",
    description:"Prosta koszulka.",
    image:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    created:Date.now()-1000
  }
];

let products =
  JSON.parse(localStorage.getItem("szafax_products"));

if(!products){
  products=defaultProducts;
  saveProducts();
}

let cart =
  JSON.parse(localStorage.getItem("szafax_cart") || "[]");

let orders =
  JSON.parse(localStorage.getItem("szafax_orders") || "[]");

let selectedParcel=null;

function saveProducts(){
  localStorage.setItem(
    "szafax_products",
    JSON.stringify(products)
  );
}

function saveCart(){
  localStorage.setItem(
    "szafax_cart",
    JSON.stringify(cart)
  );
}

function saveOrders(){
  localStorage.setItem(
    "szafax_orders",
    JSON.stringify(orders)
  );
}

function renderProducts(){

  const box=document.getElementById("products");

  if(!box)return;

  const search=
    (document.getElementById("search")?.value || "")
    .toLowerCase();

  const category=
    document.getElementById("category")?.value || "";

  const sort=
    document.getElementById("sort")?.value || "new";

  let list=products.filter(p=>{

    return p.name.toLowerCase().includes(search)
      && (!category || p.category===category);

  });

  if(sort==="cheap"){
    list.sort((a,b)=>a.price-b.price);
  }

  if(sort==="expensive"){
    list.sort((a,b)=>b.price-a.price);
  }

  if(sort==="new"){
    list.sort((a,b)=>b.created-a.created);
  }

  if(!list.length){

    box.innerHTML=
      `<p>Nie znaleziono produktów.</p>`;

    return;
  }

  box.innerHTML=list.map(p=>`

    <article class="product">

      <img
        src="${p.image}"
        alt="${escapeHTML(p.name)}"
      >

      <div class="productInfo">

        <p class="small">${escapeHTML(p.category)}</p>

        <h3>${escapeHTML(p.name)}</h3>

        <p>
          Rozmiar: ${escapeHTML(p.size)}
        </p>

        <div class="price">
          ${Number(p.price).toFixed(2)} zł
        </div>

        <button onclick="openProduct(${p.id})">
          Zobacz
        </button>

      </div>

    </article>

  `).join("");

}

function openProduct(id){

  const p=products.find(x=>x.id===id);

  if(!p)return;

  document.getElementById("productImage").src=p.image;

  document.getElementById("productCategory")
    .textContent=p.category;

  document.getElementById("productName")
    .textContent=p.name;

  document.getElementById("productPrice")
    .textContent=p.price.toFixed(2)+" zł";

  document.getElementById("productSize")
    .textContent="Rozmiar: "+p.size;

  document.getElementById("productDescription")
    .textContent=p.description || "";

  document.getElementById("addButton").onclick=()=>{

    cart.push(p);

    saveCart();

    updateCartCount();

    closeModal("productModal");

  };

  openModal("productModal");

}

function openCart(){

  renderCart();

  openModal("cartModal");

}

function renderCart(){

  const box=document.getElementById("cartItems");

  if(!cart.length){

    box.innerHTML="<p>Koszyk jest pusty.</p>";

    document.getElementById("cartTotal")
      .textContent="0,00 zł";

    return;
  }

  let total=0;

  box.innerHTML=cart.map((p,index)=>{

    total+=Number(p.price);

    return `

      <div class="cartItem">

        <img src="${p.image}">

        <div style="flex:1">

          <b>${escapeHTML(p.name)}</b>

          <p>${Number(p.price).toFixed(2)} zł</p>

          <button onclick="removeCart(${index})">
            Usuń
          </button>

        </div>

      </div>

    `;

  }).join("");

  document.getElementById("cartTotal")
    .textContent=total.toFixed(2)+" zł";

}

function removeCart(index){

  cart.splice(index,1);

  saveCart();

  updateCartCount();

  renderCart();

}

function updateCartCount(){

  document.getElementById("cartCount")
    .textContent=cart.length;

}

function goCheckout(){

  if(!cart.length){

    alert("Koszyk jest pusty.");

    return;

  }

  closeModal("cartModal");

  openModal("checkoutModal");

}

function chooseParcel(){

  /*
    DEMO.

    W prawdziwej wersji tutaj podłączymy
    oficjalny picker Paczkomatów/API InPost.
  */

  const code=prompt(
    "Wpisz kod wybranego Paczkomatu, np. WAW123M:"
  );

  if(!code)return;

  selectedParcel=code.trim().toUpperCase();

  document.getElementById("parcelInfo")
    .innerHTML=
      "📦 Wybrany Paczkomat: <b>"+
      escapeHTML(selectedParcel)+
      "</b>";

}

async function createOrder(){

  if(!cart.length){

    alert("Koszyk jest pusty.");

    return;

  }

  const name=
    document.getElementById("buyerName").value.trim();

  const email=
    document.getElementById("buyerEmail").value.trim();

  const phone=
    document.getElementById("buyerPhone").value.trim();

  if(!name || !email || !phone){

    alert("Uzupełnij dane.");

    return;

  }

  if(!selectedParcel){

    alert("Wybierz Paczkomat.");

    return;

  }

  const total=
    cart.reduce(
      (sum,p)=>sum+Number(p.price),
      0
    );

  const order={

    id:
      "SZX-"+Math.floor(
        100000+Math.random()*900000
      ),

    created:
      new Date().toISOString(),

    status:"OCZEKUJE NA PŁATNOŚĆ",

    paymentStatus:"pending",

    shipmentStatus:"not_created",

    trackingNumber:null,

    parcel:selectedParcel,

    buyer:{
      name,
      email,
      phone
    },

    items:cart.map(p=>({
      id:p.id,
      name:p.name,
      price:p.price
    })),

    total

  };

  orders.unshift(order);

  saveOrders();

  /*
    WERSJA PRODUKCYJNA:

    tutaj zamiast lokalnego zapisu
    będzie:

    POST /functions/v1/create-order

    Backend utworzy zamówienie
    i sesję płatności.

    Nigdy nie wkładamy sekretnego
    klucza płatności do tego pliku.
  */

  alert(
    "Zamówienie "+order.id+
    " zostało utworzone.\n\n"+
    "W wersji produkcyjnej nastąpi teraz "+
    "przekierowanie do płatności."
  );

  cart=[];

  saveCart();

  updateCartCount();

  closeModal("checkoutModal");

}

function openAddProduct(){

  openModal("addModal");

}

function addProduct(){

  const name=
    document.getElementById("newName").value.trim();

  const price=
    Number(document.getElementById("newPrice").value);

  const size=
    document.getElementById("newSize").value.trim();

  const category=
    document.getElementById("newCategory").value;

  const description=
    document.getElementById("newDescription").value.trim();

  const file=
    document.getElementById("newImage").files[0];

  if(!name || !price || !size || !file){

    alert("Uzupełnij wszystkie wymagane pola.");

    return;

  }

  const reader=new FileReader();

  reader.onload=()=>{

    products.push({

      id:Date.now(),

      name,

      price,

      size,

      category,

      description,

      image:reader.result,

      created:Date.now()

    });

    saveProducts();

    renderProducts();

    closeModal("addModal");

  };

  reader.readAsDataURL(file);

}

function chooseCategory(category){

  const select=document.getElementById("category");

  select.value=category;

  document
    .getElementById("shop")
    .scrollIntoView();

  renderProducts();

}

function openModal(id){

  document.getElementById(id)
    .style.display="flex";

}

function closeModal(id){

  document.getElementById(id)
    .style.display="none";

}

function escapeHTML(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}

renderProducts();
updateCartCount();
