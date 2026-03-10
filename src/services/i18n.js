// ============================================================
// I18N.JS - Système de traduction multi-langue
// ============================================================

const translations = {
  fr: {
    // Nav
    "nav.habits": "Habitudes",
    "nav.stats": "Stats",
    "nav.info": "Infos",
    "nav.profile": "Profil",
    "nav.groups": "Groupes",

    // Today page
    "today.missions": "HABITUDES DU JOUR",
    "today.score": "Score",
    "today.today": "Aujourd'hui",
    "today.streak": "Streak",
    "today.days": "Jours",
    "today.perfect": "Perfect",
    "today.perfectDays": "Jours 100%",
    "today.validateDay": "Valider la journée",
    "today.shareDay": "Partager",

    // Stats
    "stats.currentRank": "Ton Rang Actuel",
    "stats.thisMonth": "⏳ CE MOIS-CI",
    "stats.viewCalendar": "VOIR LE CALENDRIER DU MOIS",
    "stats.thisWeek": "CETTE SEMAINE",
    "stats.progression": "PROGRESSION",
    "stats.last7days": "Graphique des 7 derniers jours",
    "stats.byHabit": "Performance par habitude",
    "stats.monthScore": "Score du mois",
    "stats.bestStreak": "Meilleure série",
    "stats.totalWins": "Victoires totales",
    "stats.avgScore": "Moyenne globale",

    // Settings
    "settings.habits": "Habitudes",
    "settings.manageHabits": "Gestion des habitudes",
    "settings.manageHabitsDesc": "Ajouter, modifier ou supprimer",
    "settings.modify": "Modifier",
    "settings.appearance": "Apparence",
    "settings.theme": "Thème de l'application",
    "settings.themeDesc": "Clair ou sombre",
    "settings.notifications": "Notifications",
    "settings.reminderTime": "Heure de rappel",
    "settings.dailyReminder": "Rappel quotidien",
    "settings.enableNotifs": "Activer les notifications",
    "settings.receiveReminders": "Recevoir des rappels",
    "settings.account": "Compte",
    "settings.logout": "Déconnexion",
    "settings.logoutDesc": "Se déconnecter de l'application",
    "settings.logoutBtn": "Sortir",
    "settings.deleteAccount": "Supprimer le compte",
    "settings.deleteDesc": "Action irréversible",
    "settings.deleteBtn": "Supprimer",
    "settings.data": "Données",
    "settings.export": "Exporter les données",
    "settings.exportDesc": "Télécharger en CSV",
    "settings.reset": "Réinitialiser",
    "settings.resetDesc": "Effacer toutes les données",
    "settings.resetBtn": "Effacer",
    "settings.language": "Langue",
    "settings.languageDesc": "Changer la langue",

    // Profile
    "profile.pseudo": "Pseudo",
    "profile.bio": "Bio",
    "profile.noBio": "Aucune bio",
    "profile.myStats": "MES STATS",
    "profile.avgScore": "Score moyen",
    "profile.bestStreak": "Meilleur streak",
    "profile.perfectDays": "Jours parfaits",
    "profile.rank": "Rang",
    "profile.myGroups": "MES GROUPES",
    "profile.memberSince": "Membre depuis",

    // Auth
    "auth.login": "CONNEXION",
    "auth.signup": "INSCRIPTION",
    "auth.email": "Email",
    "auth.password": "Mot de passe (min 8 caractères)",
    "auth.confirmPassword": "Confirmer le mot de passe",
    "auth.loginBtn": "Se connecter",
    "auth.signupBtn": "S'inscrire",
    "auth.forgotPassword": "Mot de passe oublié ?",

    // General
    "general.cancel": "Annuler",
    "general.save": "Sauvegarder",
    "general.close": "Fermer",
    "general.confirm": "Confirmer",
    "general.loading": "Chargement...",

    // Motivation
    "motivation.mental": "MENTAL",
    "motivation.ranksTitle": "RANG À ATTEINDRE",
  },
  en: {
    "nav.habits": "Habits",
    "nav.stats": "Stats",
    "nav.info": "Info",
    "nav.profile": "Profile",
    "nav.groups": "Groups",

    "today.missions": "🎯 TODAY'S MISSIONS",
    "today.score": "Score",
    "today.today": "Today",
    "today.streak": "Streak",
    "today.days": "Days",
    "today.perfect": "Perfect",
    "today.perfectDays": "100% Days",
    "today.validateDay": "Validate the day",
    "today.shareDay": "Share",

    "stats.currentRank": "Your Current Rank",
    "stats.thisMonth": "⏳ THIS MONTH",
    "stats.viewCalendar": "VIEW MONTHLY CALENDAR",
    "stats.thisWeek": "THIS WEEK",
    "stats.progression": "PROGRESSION",
    "stats.last7days": "Last 7 days score",
    "stats.byHabit": "Performance by habit",
    "stats.monthScore": "Month score",
    "stats.bestStreak": "Best streak",
    "stats.totalWins": "Total wins",
    "stats.avgScore": "Overall average",

    "settings.habits": "Habits",
    "settings.manageHabits": "Manage habits",
    "settings.manageHabitsDesc": "Add, edit or delete",
    "settings.modify": "Edit",
    "settings.appearance": "Appearance",
    "settings.theme": "App theme",
    "settings.themeDesc": "Light or dark",
    "settings.notifications": "Notifications",
    "settings.reminderTime": "Reminder time",
    "settings.dailyReminder": "Daily reminder",
    "settings.enableNotifs": "Enable notifications",
    "settings.receiveReminders": "Receive reminders",
    "settings.account": "Account",
    "settings.logout": "Logout",
    "settings.logoutDesc": "Sign out of the app",
    "settings.logoutBtn": "Sign out",
    "settings.deleteAccount": "Delete account",
    "settings.deleteDesc": "Irreversible action",
    "settings.deleteBtn": "Delete",
    "settings.data": "Data",
    "settings.export": "Export data",
    "settings.exportDesc": "Download as CSV",
    "settings.reset": "Reset",
    "settings.resetDesc": "Erase all data",
    "settings.resetBtn": "Erase",
    "settings.language": "Language",
    "settings.languageDesc": "Change language",

    "profile.pseudo": "Username",
    "profile.bio": "Bio",
    "profile.noBio": "No bio",
    "profile.myStats": "MY STATS",
    "profile.avgScore": "Average score",
    "profile.bestStreak": "Best streak",
    "profile.perfectDays": "Perfect days",
    "profile.rank": "Rank",
    "profile.myGroups": "MY GROUPS",
    "profile.memberSince": "Member since",

    "auth.login": "LOGIN",
    "auth.signup": "SIGN UP",
    "auth.email": "Email",
    "auth.password": "Password (min 8 characters)",
    "auth.confirmPassword": "Confirm password",
    "auth.loginBtn": "Sign in",
    "auth.signupBtn": "Sign up",
    "auth.forgotPassword": "Forgot password?",

    "general.cancel": "Cancel",
    "general.save": "Save",
    "general.close": "Close",
    "general.confirm": "Confirm",
    "general.loading": "Loading...",

    "motivation.mental": "MINDSET",
    "motivation.ranksTitle": "RANKS TO REACH",
  },
  es: {
    "nav.habits": "Hábitos",
    "nav.stats": "Stats",
    "nav.info": "Info",
    "nav.profile": "Perfil",
    "nav.groups": "Grupos",

    "today.missions": "MISIONES DEL DÍA",
    "today.score": "Puntuación",
    "today.today": "Hoy",
    "today.streak": "Racha",
    "today.days": "Días",
    "today.perfect": "Perfecto",
    "today.perfectDays": "Días 100%",
    "today.validateDay": "Validar el día",
    "today.shareDay": "Compartir",

    "stats.currentRank": "Tu Rango Actual",
    "stats.thisMonth": "⏳ ESTE MES",
    "stats.viewCalendar": "VER CALENDARIO DEL MES",
    "stats.thisWeek": "ESTA SEMANA",
    "stats.progression": "PROGRESIÓN",
    "stats.last7days": "Puntuación últimos 7 días",
    "stats.byHabit": "Rendimiento por hábito",
    "stats.monthScore": "Puntuación del mes",
    "stats.bestStreak": "Mejor racha",
    "stats.totalWins": "Victorias totales",
    "stats.avgScore": "Promedio general",

    "settings.habits": "Hábitos",
    "settings.manageHabits": "Gestión de hábitos",
    "settings.manageHabitsDesc": "Añadir, editar o eliminar",
    "settings.modify": "Editar",
    "settings.appearance": "Apariencia",
    "settings.theme": "Tema de la app",
    "settings.themeDesc": "Claro u oscuro",
    "settings.notifications": "Notificaciones",
    "settings.reminderTime": "Hora de recordatorio",
    "settings.dailyReminder": "Recordatorio diario",
    "settings.enableNotifs": "Activar notificaciones",
    "settings.receiveReminders": "Recibir recordatorios",
    "settings.account": "Cuenta",
    "settings.logout": "Cerrar sesión",
    "settings.logoutDesc": "Desconectarse de la app",
    "settings.logoutBtn": "Salir",
    "settings.deleteAccount": "Eliminar cuenta",
    "settings.deleteDesc": "Acción irreversible",
    "settings.deleteBtn": "Eliminar",
    "settings.data": "Datos",
    "settings.export": "Exportar datos",
    "settings.exportDesc": "Descargar en CSV",
    "settings.reset": "Reiniciar",
    "settings.resetDesc": "Borrar todos los datos",
    "settings.resetBtn": "Borrar",
    "settings.language": "Idioma",
    "settings.languageDesc": "Cambiar idioma",

    "profile.pseudo": "Apodo",
    "profile.bio": "Bio",
    "profile.noBio": "Sin bio",
    "profile.myStats": "MIS STATS",
    "profile.avgScore": "Puntuación media",
    "profile.bestStreak": "Mejor racha",
    "profile.perfectDays": "Días perfectos",
    "profile.rank": "Rango",
    "profile.myGroups": "MIS GRUPOS",
    "profile.memberSince": "Miembro desde",

    "auth.login": "INICIAR SESIÓN",
    "auth.signup": "REGISTRARSE",
    "auth.email": "Correo electrónico",
    "auth.password": "Contraseña (mín 8 caracteres)",
    "auth.confirmPassword": "Confirmar contraseña",
    "auth.loginBtn": "Entrar",
    "auth.signupBtn": "Registrarse",
    "auth.forgotPassword": "¿Contraseña olvidada?",

    "general.cancel": "Cancelar",
    "general.save": "Guardar",
    "general.close": "Cerrar",
    "general.confirm": "Confirmar",
    "general.loading": "Cargando...",

    "motivation.mental": "MENTALIDAD",
    "motivation.ranksTitle": "RANGOS A ALCANZAR",
  },
};

let currentLang = localStorage.getItem("warriorLang") || "fr";

export function t(key) {
  return (
    (translations[currentLang] && translations[currentLang][key]) ||
    (translations["fr"] && translations["fr"][key]) ||
    key
  );
}

export function getCurrentLang() {
  return currentLang;
}

export function setLang(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem("warriorLang", lang);
  applyTranslations();
}

export function getAvailableLangs() {
  return [
    { code: "fr", label: "🇫🇷 Français" },
    { code: "en", label: "🇬🇧 English" },
    { code: "es", label: "🇪🇸 Español" },
  ];
}

// Apply translations to all elements with data-i18n attribute
export function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const translation = t(key);
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.placeholder = translation;
    } else {
      el.textContent = translation;
    }
  });
  // Also update aria-labels
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    el.setAttribute("aria-label", t(key));
  });
}

export function cycleLang() {
  const langs = ["fr", "en", "es"];
  const idx = langs.indexOf(currentLang);
  const next = langs[(idx + 1) % langs.length];
  setLang(next);
  return next;
}
