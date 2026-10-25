import { auth, db, configReady } from "./firebase.js";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { ref, onValue, get, update, remove, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { money, safeText, validImage, toast, firebaseError } from "./shared.js";
const $=id=>document.getElementById(id);
let allProducts=[], allOrders=[], isAdmin=false, stopProducts=null, stopOrders=null;
const fmt=money;
function msg(id,text){$(id).textContent=text;}
function setBusy(btn,busy,text){btn.disabled=busy;if(busy)btn.textContent=text;}
function stopListeners(){if(stopProducts)stopProducts();if(stopOrders)stopOrders();stopProducts=stopOrders=null;}
function resetEditor(){const f=$("productForm");f.reset();f.elements.productId.value="";f.elements.published.checked=true;$("editorTitle").textContent="إضافة منتج جديد";$("saveProductBtn").innerHTML='حفظ المنتج <span>←</span>';$("cancelEditBtn").classList.add("hidden");msg("productMessage","");}
function renderProducts(){
 const q=$("adminSearch").value.trim().toLocaleLowerCase("ar");
 const rows=allProducts.filter(p=>`${p.name} ${p.category}`.toLocaleLowerCase("ar").includes(q));
 $("adminProductRows").innerHTML=rows.map(p=>`<tr><td><div class="table-product"><div class="table-thumb">${validImage(p.imageUrl)?`<img src="${safeText(validImage(p.imageUrl))}" alt="">`:"T"}</div><div><b>${safeText(p.name)}</b><small>${safeText(p.category||"بدون قسم")}</small></div></div></td><td>${fmt(p.price)}</td><td><span class="state-pill ${p.published?"published":"draft"}">${p.published?"منشور":"مسودة"}</span></td><td><div class="row-actions"><button class="tiny-btn" data-edit="${safeText(p.id)}">تعديل</button><button class="tiny-btn" data-toggle="${safeText(p.id)}">${p.published?"إخفاء":"نشر"}</button><button class="tiny-btn danger" data-delete="${safeText(p.id)}">حذف</button></div></td></tr>`).join("");
 $("adminProductsEmpty").classList.toggle("hidden",rows.length!==0);
 $("statProducts").textContent=allProducts.length;$("statPublished").textContent=allProducts.filter(p=>p.published).length;
}
function renderOrders(){
 const rows=allOrders.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,30);
 $("adminOrderRows").innerHTML=rows.map(o=>`<tr><td><code>${safeText(o.id.slice(-7).toUpperCase())}</code><small>${o.createdAt?new Date(o.createdAt).toLocaleString("ar-EG"):"—"}</small></td><td><b>${safeText(o.customerName)}</b><small>${safeText(o.phone)}</small><small>${safeText(o.address)}</small></td><td>${(o.items||[]).map(i=>`${safeText(i.name)} × ${Number(i.quantity)||1}`).join("<br>")}</td><td><b>${fmt(o.total)}</b></td><td><span class="state-pill ${o.status==="مكتمل"?"published":"draft"}">${safeText(o.status||"جديد")}</span></td><td><select class="order-status" data-order-status="${safeText(o.id)}" aria-label="حالة الطلب"><option ${o.status==="جديد"?"selected":""}>جديد</option><option ${o.status==="قيد التواصل"?"selected":""}>قيد التواصل</option><option ${o.status==="تم التأكيد"?"selected":""}>تم التأكيد</option><option ${o.status==="مكتمل"?"selected":""}>مكتمل</option><option ${o.status==="ملغي"?"selected":""}>ملغي</option></select></td></tr>`).join("");
 $("adminOrdersEmpty").classList.toggle("hidden",rows.length!==0);$("statOrders").textContent=allOrders.length;
}
function startListeners(){
 stopListeners();
 stopProducts=onValue(ref(db,"products"),snap=>{const raw=snap.val()||{};allProducts=Object.entries(raw).map(([id,p])=>({...p,id})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));renderProducts();},e=>toast("تعذر قراءة المنتجات: "+firebaseError(e)));
 stopOrders=onValue(ref(db,"orders"),snap=>{const raw=snap.val()||{};allOrders=Object.entries(raw).map(([id,o])=>({...o,id}));renderOrders();},e=>toast("تعذر قراءة الطلبات: "+firebaseError(e)));
}
async function verifyAdmin(user){
 const s=await get(ref(db,`admins/${user.uid}`));return s.val()===true;
}
onAuthStateChanged(auth,async user=>{
 stopListeners();isAdmin=false;
 if(!user){$("loginPanel").classList.remove("hidden");$("dashboardPanel").classList.add("hidden");$("signOutBtn").classList.add("hidden");return;}
 if(!configReady){msg("loginMessage","أكمل إعداد Firebase في assets/firebase-config.js.");await signOut(auth);return;}
 try{
  isAdmin=await verifyAdmin(user);
  if(!isAdmin){msg("loginMessage","الحساب سجل الدخول، لكنه غير مصرح له بالإدارة. أضف UID الحساب إلى admins في Realtime Database من Firebase Console.");await signOut(auth);return;}
  $("loginPanel").classList.add("hidden");$("dashboardPanel").classList.remove("hidden");$("signOutBtn").classList.remove("hidden");startListeners();
 }catch(e){msg("loginMessage","تعذر التحقق من صلاحية الإدارة: "+firebaseError(e));await signOut(auth);}
});
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();if(!configReady){msg("loginMessage","أكمل إعداد assets/firebase-config.js أولًا.");return;}const f=new FormData(e.currentTarget),btn=$("loginBtn");setBusy(btn,true,"جاري تسجيل الدخول...");msg("loginMessage","");try{await signInWithEmailAndPassword(auth,String(f.get("email")).trim(),String(f.get("password")));}catch(err){msg("loginMessage",firebaseError(err));}finally{btn.disabled=false;btn.innerHTML='دخول لوحة التحكم <span>←</span>';}});
$("signOutBtn").onclick=()=>signOut(auth);
$("adminSearch").addEventListener("input",renderProducts);
$("cancelEditBtn").onclick=resetEditor;
$("productForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!isAdmin)return;const f=e.currentTarget,fd=new FormData(f),id=String(fd.get("productId")||""),btn=$("saveProductBtn");
 const name=String(fd.get("name")||"").trim(),category=String(fd.get("category")||"").trim(),price=Number(fd.get("price")),oldPrice=fd.get("oldPrice")===""?null:Number(fd.get("oldPrice")),stock=fd.get("stock")===""?null:Number(fd.get("stock")),imageUrl=validImage(String(fd.get("imageUrl")||"")),description=String(fd.get("description")||"").trim(),published=f.elements.published.checked;
 if(!name||!category||!Number.isFinite(price)||price<0){msg("productMessage","راجع اسم المنتج والقسم والسعر.");return;}
 if(fd.get("imageUrl")&&!imageUrl){msg("productMessage","رابط الصورة لازم يبدأ بـ https:// أو http://.");return;}
 const existing=allProducts.find(p=>p.id===id),product={name,category,price,oldPrice:oldPrice!==null&&Number.isFinite(oldPrice)&&oldPrice>=0?oldPrice:null,stock:stock!==null&&Number.isFinite(stock)&&stock>=0?stock:null,imageUrl,description,published,createdAt:existing?.createdAt||Date.now(),updatedAt:Date.now()};
 setBusy(btn,true,"جاري الحفظ...");msg("productMessage","");
 try{
  const productId=id||push(ref(db,"products")).key;
  const updates={};updates[`products/${productId}`]=product;
  if(published)updates[`publicProducts/${productId}`]=product;else updates[`publicProducts/${productId}`]=null;
  await update(ref(db),updates);resetEditor();toast(id?"تم تحديث المنتج":"تم حفظ المنتج بنجاح");
 }catch(err){msg("productMessage",firebaseError(err));}
 finally{btn.disabled=false;btn.innerHTML='حفظ المنتج <span>←</span>';}
});
$("adminProductRows").addEventListener("click",async e=>{
 const edit=e.target.closest("[data-edit]"),toggle=e.target.closest("[data-toggle]"),del=e.target.closest("[data-delete]");
 if(edit){const p=allProducts.find(p=>p.id===edit.dataset.edit);if(!p)return;const f=$("productForm");for(const key of ["productId","name","price","oldPrice","category","stock","imageUrl","description"])f.elements[key].value=p[key]??"";f.elements.published.checked=p.published===true;$("editorTitle").textContent="تعديل المنتج";$("saveProductBtn").innerHTML='حفظ التعديلات <span>←</span>';$("cancelEditBtn").classList.remove("hidden");msg("productMessage","");window.scrollTo({top:0,behavior:"smooth"});}
 if(toggle){const p=allProducts.find(p=>p.id===toggle.dataset.toggle);if(!p)return;const next={...p,published:!p.published,updatedAt:Date.now()};delete next.id;try{const updates={};updates[`products/${p.id}`]=next;updates[`publicProducts/${p.id}`]=next.published?next:null;await update(ref(db),updates);toast(next.published?"تم نشر المنتج":"تم إخفاء المنتج");}catch(err){toast(firebaseError(err));}}
 if(del){const p=allProducts.find(p=>p.id===del.dataset.delete);if(!p||!confirm(`متأكد إنك عاوز تحذف "${p.name}" نهائيًا؟`))return;try{await update(ref(db),{[`products/${p.id}`]:null,[`publicProducts/${p.id}`]:null});toast("تم حذف المنتج");if($("productForm").elements.productId.value===p.id)resetEditor();}catch(err){toast(firebaseError(err));}}
});
$("adminOrderRows").addEventListener("change",async e=>{const el=e.target.closest("[data-order-status]");if(!el)return;try{await update(ref(db,`orders/${el.dataset.orderStatus}`),{status:el.value,updatedAt:Date.now()});toast("تم تحديث حالة الطلب");}catch(err){toast(firebaseError(err));}});
$("refreshOrdersBtn").onclick=async()=>{try{const s=await get(ref(db,"orders"));const raw=s.val()||{};allOrders=Object.entries(raw).map(([id,o])=>({...o,id}));renderOrders();toast("تم تحديث الطلبات");}catch(e){toast(firebaseError(e));}};
if(!configReady)msg("loginMessage","قبل الاستخدام، عدّل بيانات Firebase داخل assets/firebase-config.js.");
