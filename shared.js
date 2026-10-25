export const money = value => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(Number(value) || 0) + " ج.م";
export const safeText = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
export const validImage = url => {
  try { const u = new URL(url); return ["https:", "http:"].includes(u.protocol) ? u.href : ""; } catch { return ""; }
};
export function toast(message) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message; el.classList.add("show");
  clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}
export function firebaseError(error) {
  const code = error?.code || "";
  const messages = {
    "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة.",
    "auth/too-many-requests": "محاولات كثيرة. حاول مرة أخرى بعد قليل.",
    "auth/network-request-failed": "تعذر الاتصال بالإنترنت.",
    "PERMISSION_DENIED": "الصلاحيات مرفوضة. راجع قواعد Firebase وتأكد من تسجيل دخول حساب الإدارة.",
    "permission-denied": "الصلاحيات مرفوضة. تأكد من UID الإدارة وقواعد قاعدة البيانات.",
    "auth/operation-not-allowed": "فعّل تسجيل الدخول بالبريد وكلمة المرور من Firebase Authentication."
  };
  return messages[code] || error?.message || "حصل خطأ غير متوقع. راجع إعدادات Firebase.";
}
