export type Locale = 'en' | 'es';

export const translations = {
  // ─── Home / Feed ───────────────────────────────────────
  'home.hero.title': {
    en: 'What are your',
    es: '¿Cuáles son tus',
  },
  'home.hero.titleAccent': {
    en: 'top 4',
    es: 'top 4',
  },
  'home.hero.titleEnd': {
    en: '?',
    es: '?',
  },
  'home.hero.subtitle': {
    en: 'Movies. Artists. Books. Pick your favorites. See what everyone else loves.',
    es: 'Películas. Artistas. Libros. Elige tus favoritos. Descubre lo que todos aman.',
  },
  'home.empty.text': {
    en: 'No cards yet — be the first to share your favorites!',
    es: '¡Aún no hay tarjetas — sé el primero en compartir tus favoritos!',
  },
  'home.loadingMore': {
    en: 'Loading more...',
    es: 'Cargando más...',
  },
  'home.endOfFeed': {
    en: "You've seen it all ✨",
    es: 'Ya lo has visto todo ✨',
  },
  'home.refresh': {
    en: 'Refresh',
    es: 'Actualizar',
  },
  'home.refreshing': {
    en: 'Refreshing...',
    es: 'Actualizando...',
  },

  // ─── Categories ────────────────────────────────────────
  'category.movies': {
    en: 'Movies',
    es: 'Películas',
  },
  'category.tv': {
    en: 'TV Shows',
    es: 'Series',
  },
  'category.artists': {
    en: 'Artists',
    es: 'Artistas',
  },
  'category.books': {
    en: 'Books',
    es: 'Libros',
  },
  'category.search.movies': {
    en: 'Search movies...',
    es: 'Buscar películas...',
  },
  'category.search.tv': {
    en: 'Search TV shows...',
    es: 'Buscar series...',
  },
  'category.search.artists': {
    en: 'Search artists...',
    es: 'Buscar artistas...',
  },
  'category.search.books': {
    en: 'Search books...',
    es: 'Buscar libros...',
  },

  // ─── Header ────────────────────────────────────────────
  'header.notifications': {
    en: 'Notifications',
    es: 'Notificaciones',
  },
  'header.noNotifications': {
    en: 'No notifications yet',
    es: 'Sin notificaciones aún',
  },
  'header.likedYourList': {
    en: 'liked your',
    es: 'le gustó tu lista de',
  },
  'header.list': {
    en: 'list',
    es: '',
  },
  'header.myTop4s': {
    en: 'My Top 4s',
    es: 'Mis Top 4',
  },
  'header.viewProfile': {
    en: 'View My Profile',
    es: 'Ver mi perfil',
  },
  'header.likedLists': {
    en: '♥ Liked Lists',
    es: '♥ Listas favoritas',
  },
  'header.signOut': {
    en: 'Sign Out',
    es: 'Cerrar sesión',
  },
  'header.signIn': {
    en: 'Sign In',
    es: 'Iniciar sesión',
  },

  // ─── Login ─────────────────────────────────────────────
  'login.subtitle': {
    en: 'Sign in with your phone number',
    es: 'Inicia sesión con tu número de teléfono',
  },
  'login.phoneLabel': {
    en: 'Phone number',
    es: 'Número de teléfono',
  },
  'login.sendCode': {
    en: 'Send Code',
    es: 'Enviar código',
  },
  'login.sending': {
    en: 'Sending...',
    es: 'Enviando...',
  },
  'login.smsNotice': {
    en: "We'll text you a verification code.",
    es: 'Te enviaremos un código de verificación por SMS.',
  },
  'login.codeSentTo': {
    en: 'Code sent to',
    es: 'Código enviado a',
  },
  'login.codeLabel': {
    en: 'Verification code',
    es: 'Código de verificación',
  },
  'login.verify': {
    en: 'Verify',
    es: 'Verificar',
  },
  'login.verifying': {
    en: 'Verifying...',
    es: 'Verificando...',
  },
  'login.differentNumber': {
    en: 'Use a different number',
    es: 'Usar otro número',
  },
  'login.backToFeed': {
    en: '← Back to feed',
    es: '← Volver al feed',
  },
  'login.failedSendCode': {
    en: 'Failed to send code',
    es: 'Error al enviar el código',
  },
  'login.failedSendRetry': {
    en: 'Failed to send code. Please try again.',
    es: 'Error al enviar el código. Intenta de nuevo.',
  },
  'login.invalidCode': {
    en: 'Invalid code',
    es: 'Código inválido',
  },
  'login.verificationFailed': {
    en: 'Verification failed. Please try again.',
    es: 'Verificación fallida. Intenta de nuevo.',
  },

  // ─── Profile ───────────────────────────────────────────
  'profile.namePlaceholder': {
    en: 'Your name or nickname',
    es: 'Tu nombre o apodo',
  },
  'profile.myTop4s': {
    en: 'My Top 4s',
    es: 'Mis Top 4',
  },
  'profile.liked': {
    en: 'Liked',
    es: 'Favoritos',
  },
  'profile.loading': {
    en: 'Loading...',
    es: 'Cargando...',
  },
  'profile.noLikedLists': {
    en: 'No liked lists yet',
    es: 'Aún no tienes listas favoritas',
  },
  'profile.heartToSave': {
    en: 'Heart a list in the feed to save it here',
    es: 'Dale ♥ a una lista en el feed para guardarla aquí',
  },
  'profile.yourTop4': {
    en: 'Your Top 4',
    es: 'Tu Top 4 de',
  },
  'profile.saved': {
    en: 'Saved ✓',
    es: 'Guardado ✓',
  },
  'profile.saveFailed': {
    en: 'Save failed',
    es: 'Error al guardar',
  },
  'profile.photoUpdated': {
    en: 'Photo updated!',
    es: '¡Foto actualizada!',
  },
  'profile.selectImage': {
    en: 'Please select an image file',
    es: 'Por favor selecciona un archivo de imagen',
  },
  'profile.imageUnder5MB': {
    en: 'Image must be under 5MB',
    es: 'La imagen debe ser menor a 5MB',
  },
  'profile.uploadFailed': {
    en: 'Upload failed — check Firebase Storage rules',
    es: 'Error al subir — revisa las reglas de Firebase Storage',
  },

  // ─── Profile Validation ────────────────────────────────
  'validation.nameMin': {
    en: 'Name must be at least 2 characters.',
    es: 'El nombre debe tener al menos 2 caracteres.',
  },
  'validation.nameLetter': {
    en: 'Name must contain at least one letter.',
    es: 'El nombre debe contener al menos una letra.',
  },
  'validation.noUrls': {
    en: 'URLs are not allowed in names.',
    es: 'No se permiten URLs en el nombre.',
  },
  'validation.noEmail': {
    en: 'Email addresses are not allowed in names.',
    es: 'No se permiten correos electrónicos en el nombre.',
  },
  'validation.noPhone': {
    en: 'Phone numbers are not allowed in names.',
    es: 'No se permiten números de teléfono en el nombre.',
  },
  'validation.looksLikeNumber': {
    en: 'Name looks like a number — try a nickname.',
    es: 'El nombre parece un número — intenta con un apodo.',
  },
  'validation.tooManyRepeats': {
    en: 'Name has too many repeated characters.',
    es: 'El nombre tiene demasiados caracteres repetidos.',
  },
  'validation.tooManySymbols': {
    en: 'Too many symbols in the name.',
    es: 'Demasiados símbolos en el nombre.',
  },
  'validation.allCaps': {
    en: 'Names in ALL CAPS look like ads. Use normal capitalization.',
    es: 'Los nombres en MAYÚSCULAS parecen publicidad. Usa mayúsculas normales.',
  },

  // ─── Leaderboard ───────────────────────────────────────
  'leaderboard.title': {
    en: 'Leaderboards',
    es: 'Clasificaciones',
  },
  'leaderboard.noLeaders': {
    en: 'No leaders yet — be the first!',
    es: '¡Aún no hay líderes — sé el primero!',
  },
  'leaderboard.pageTitle': {
    en: 'Leaderboard',
    es: 'Clasificación',
  },
  'leaderboard.mostLoved': {
    en: 'The most loved {category} lists, ranked by community likes.',
    es: 'Las listas de {category} más queridas, clasificadas por los me gusta de la comunidad.',
  },
  'leaderboard.noLeadersYet': {
    en: 'No leaders yet',
    es: 'Aún no hay líderes',
  },
  'leaderboard.beFirst': {
    en: 'Be the first to like a {category} list and crown its owner!',
    es: '¡Sé el primero en dar me gusta a una lista de {category} y coronar a su dueño!',
  },
  'leaderboard.browseFeed': {
    en: 'Browse the Feed',
    es: 'Explorar el feed',
  },
  'leaderboard.backToFeed': {
    en: '← Back to Feed',
    es: '← Volver al feed',
  },
  'leaderboard.1stPlace': {
    en: '1st Place',
    es: '1er lugar',
  },
  'leaderboard.2ndPlace': {
    en: '2nd Place',
    es: '2do lugar',
  },
  'leaderboard.3rdPlace': {
    en: '3rd Place',
    es: '3er lugar',
  },
  'leaderboard.topList': {
    en: '👑 Top List',
    es: '👑 Lista #1',
  },
  'leaderboard.categoryNotFound': {
    en: 'Category not found',
    es: 'Categoría no encontrada',
  },

  // ─── User Profile ──────────────────────────────────────
  'userProfile.notFound': {
    en: 'User not found',
    es: 'Usuario no encontrado',
  },
  'userProfile.notFoundDesc': {
    en: "This profile doesn't exist or has been removed.",
    es: 'Este perfil no existe o ha sido eliminado.',
  },
  'userProfile.backToFeed': {
    en: '← Back to feed',
    es: '← Volver al feed',
  },
  'userProfile.noLists': {
    en: 'No lists yet',
    es: 'Sin listas aún',
  },
  'userProfile.listCount': {
    en: '{count} list{plural}',
    es: '{count} lista{plural}',
  },

  // ─── TasteCard ─────────────────────────────────────────
  'tasteCard.unlike': {
    en: 'Unlike',
    es: 'Quitar me gusta',
  },
  'tasteCard.like': {
    en: 'Like this list',
    es: 'Me gusta esta lista',
  },
  'tasteCard.signInToLike': {
    en: 'Sign in to like',
    es: 'Inicia sesión para dar me gusta',
  },

  // ─── Search ────────────────────────────────────────────
  'search.remove': {
    en: 'Remove',
    es: 'Eliminar',
  },

  // ─── Drag & Drop ──────────────────────────────────────
  'drag.reorder': {
    en: 'Drag to reorder',
    es: 'Arrastra para reordenar',
  },

  // ─── Ads ───────────────────────────────────────────────
  'ad.sponsored': {
    en: 'Sponsored',
    es: 'Patrocinado',
  },

  // ─── Misc ──────────────────────────────────────────────
  'misc.top4': {
    en: 'Top 4',
    es: 'Top 4',
  },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale, replacements?: Record<string, string>): string {
  const entry = translations[key];
  let text: string = entry?.[locale] ?? entry?.['en'] ?? key;
  
  if (replacements) {
    for (const [placeholder, value] of Object.entries(replacements)) {
      text = text.replace(`{${placeholder}}`, value);
    }
  }
  
  return text;
}
