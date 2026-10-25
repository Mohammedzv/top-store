import { db, configReady } from "./firebase.js";
import { ref, onValue, push, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { money, safeText, validImage, toast } from "./shared.js";

const $ = id => document.getElementById(id);
const grid = $("productGrid"), status = $("connectionStatus");
let products = [], cart = loadCart(), categories = [];
const fmt = money;
function loadCart(){ try { const x = JSON.parse(localStorage.getItem("topstore_cart") || "[]"); return Array.isArray(x) ? x.filter(i => i && typeof i.id === "string" && Number.isFinite(+i.qty) && +i.qty > 0) : []; } catch { return []; } }
function saveCart(){ localStorage.setItem("topstore_cart", JSON.stringify(cart)); renderCart(); }
function price(p){ return Number(p.price) || 0; }
function imageMarkup(p, extra=""){ const src=validImage(p.imageUrl); return src ? `<img class="${extra}" src="${safeText(src)}" alt="${safeText(p.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><div class="product-placeholder" style="display:none">TOP<br>STORE</div>` : `<div class="product-placeholder">TOP<br>STORE</div>`; }
function renderProducts(){
  const q=$("searchInput").value.trim().toLocaleLowerCase("ar"), cat=$("categoryFilter").value, sort=$("sortFilter").value;
  let list=products.filter(p=>p.published===true && (!q || `${p.name} ${p.category} ${p.description||""}`.toLocaleLowerCase("ar").includes(q)) && (cat==="all" || p.category===cat));
  if(sort==="price-asc") list.sort((a,b)=>price(a)-price(b)); else if(sort==="price-desc") list.sort((a,b)=>price(b)-price(a)); else if(sort==="newest") list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  grid.innerHTML=list.map(p=>`<article class="product-card"><div class="product-image">${imageMarkup(p)}${p.oldPrice>p.price?'<span class="sale-badge">عرض</span>':""}<button class="quick-add" data-add="${safeText(p.id)}" aria-label="أضف للسلة">＋</button></div><div class="product-info"><span class="product-category">${safeText(p.category||"منتجات")}</span><h3>${safeText(p.name)}</h3><p class="product-description">${safeText(p.description||"منتج مميز من TOP STORE.")}</p><div class="product-bottom"><div class="price-block"><b>${fmt(p.price)}</b>${p.oldPrice>p.price?`<del>${fmt(p.oldPrice)}</del>`:""}</div><button class="add-btn" data-add="${safeText(p.id)}">أضف للسلة <span>＋</span></button></div></div></article>`).join("");
  $("emptyState").classList.toggle("hidden",list.length!==0);
}
function renderCategories(){
  const selected=$("categoryFilter").value;
  categories=[...new Set(products.filter(p=>p.published===true && p.category).map(p=>p.category))].sort();
  $("categoryFilter").innerHTML='<option value="all">كل الأقسام</option>'+categories.map(c=>`<option value="${safeText(c)}">${safeText(c)}</option>`).join("");
  $("categoryFilter").value=categories.includes(selected)?selected:"all";
}
function addToCart(id){ const p=products.find(p=>p.id===id && p.published===true); if(!p)return; const item=cart.find(i=>i.id===id); if(item)item.qty=Math.min(99,item.qty+1);else cart.push({id,qty:1}); saveCart(); toast("اتضاف للسلة بنجاح"); }
function renderCart(){
  cart=cart.map(i=>({...i,qty:Math.min(99,Math.max(1,Math.floor(+i.qty||1)))})).filter(i=>products.some(p=>p.id===i.id&&p.published===true));
  const count=cart.reduce((s,i)=>s+i.qty,0), total=cart.reduce((s,i)=>s+(price(products.find(p=>p.id===i.id)||{})*i.qty),0);
  $("cartCount").textContent=count; $("drawerCount").textContent=`(${count})`; $("cartTotal").textContent=fmt(total); $("checkoutTotal").textContent=fmt(total);
  $("cartItems").innerHTML=cart.map(i=>{const p=products.find(p=>p.id===i.id);return `<article class="cart-item"><div class="cart-thumb">${imageMarkup(p)}</div><div class="cart-item-info"><b>${safeText(p.name)}</b><small>${fmt(p.price)}</small><div class="qty-controls"><button data-qty="${safeText(i.id)}" data-delta="-1" aria-label="تقليل">−</button><span>${i.qty}</span><button data-qty="${safeText(i.id)}" data-delta="1" aria-label="زيادة">＋</button><button class="remove-item" data-remove="${safeText(i.id)}">حذف</button></div></div><b>${fmt(price(p)*i.qty)}</b></article>`}).join("");
  $("cartEmpty").classList.toggle("hidden",cart.length>0); $("checkoutBtn").disabled=cart.length===0;
  localStorage.setItem("topstore_cart",JSON.stringify(cart));
}
function openCart(){ $("cartOverlay").classList.remove("hidden");$("cartDrawer").classList.add("open");$("cartDrawer").setAttribute("aria-hidden","false");document.body.classList.add("no-scroll");}
function closeCart(){ $("cartOverlay").classList.add("hidden");$("cartDrawer").classList.remove("open");$("cartDrawer").setAttribute("aria-hidden","true");document.body.classList.remove("no-scroll");}
$("productGrid").addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(b)addToCart(b.dataset.add);});
$("cartItems").addEventListener("click",e=>{const q=e.target.closest("[data-qty]"),r=e.target.closest("[data-remove]");if(q){const i=cart.find(x=>x.id===q.dataset.qty);if(i){i.qty+=Number(q.dataset.delta);if(i.qty<1)cart=cart.filter(x=>x.id!==i.id);saveCart();}}if(r){cart=cart.filter(x=>x.id!==r.dataset.remove);saveCart();}});
$("openCart").onclick=openCart;$("closeCart").onclick=closeCart;$("cartOverlay").onclick=closeCart;
["searchInput","categoryFilter","sortFilter"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",renderProducts));
$("clearFilters").onclick=()=>{$("searchInput").value="";$("categoryFilter").value="all";$("sortFilter").value="featured";renderProducts();};
$("checkoutBtn").onclick=()=>{if(!cart.length)return;closeCart();$("checkoutMessage").textContent="";$("checkoutModal").classList.remove("hidden");};
$("closeCheckout").onclick=()=>$("checkoutModal").classList.add("hidden");
$("checkoutModal").addEventListener("click",e=>{if(e.target===$("checkoutModal"))$("checkoutModal").classList.add("hidden");});
$("checkoutForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!configReady){$("checkoutMessage").textContent="إعداد Firebase غير مكتمل. أكمل assets/firebase-config.js أولًا.";return;}
 if(!cart.length)return;
 const btn=$("submitOrder");btn.disabled=true;btn.textContent="جاري إرسال الطلب...";
 const f=new FormData(e.currentTarget), items=cart.map(i=>{const p=products.find(p=>p.id===i.id);return p?{productId:p.id,name:p.name,price:price(p),quantity:i.qty}:null;}).filter(Boolean);
 const total=items.reduce((s,i)=>s+i.price*i.quantity,0);
 try{
   const orderRef=push(ref(db,"orders"));
   await set(orderRef,{customerName:String(f.get("customerName")).trim(),phone:String(f.get("phone")).trim(),address:String(f.get("address")).trim(),notes:String(f.get("notes")||"").trim(),items,total,status:"جديد",createdAt:serverTimestamp()});
   cart=[];saveCart();e.currentTarget.reset();$("checkoutMessage").textContent="";$("checkoutModal").classList.add("hidden");toast("تم إرسال طلبك بنجاح. احتفظ برقم الطلب: "+orderRef.key);closeCart();
 }catch(err){$("checkoutMessage").textContent=err.code==="PERMISSION_DENIED"||err.code==="permission-denied"?"تعذر إرسال الطلب بسبب صلاحيات قاعدة البيانات. راجع database.rules.json.":"تعذر إرسال الطلب. تأكد من الإنترنت وإعدادات Firebase.";}
 finally{btn.disabled=false;btn.innerHTML='إرسال الطلب <span>←</span>';}
});
$("themeToggle").onclick=()=>{const dark=document.body.classList.toggle("dark-mode");localStorage.setItem("topstore_theme",dark?"dark":"light");$("themeToggle").textContent=dark?"☀":"☾";};
if(localStorage.getItem("topstore_theme")==="dark"){document.body.classList.add("dark-mode");$("themeToggle").textContent="☀";}
$("year").textContent=new Date().getFullYear();
renderCart();
if(!configReady){status.innerHTML='<span class="status-dot offline"></span> أكمل إعداد Firebase لعرض المنتجات';grid.innerHTML="";$("emptyState").classList.remove("hidden");}
else{
 onValue(ref(db,"publicProducts"),snap=>{const raw=snap.val()||{};products=Object.entries(raw).map(([id,p])=>({...p,id})).filter(p=>p.published===true);status.innerHTML='<span class="status-dot"></span> المنتجات محدثة مباشرة';renderCategories();renderProducts();renderCart();},err=>{status.innerHTML='<span class="status-dot offline"></span> تعذر تحميل المنتجات. راجع إعدادات Firebase';grid.innerHTML="";});
}
