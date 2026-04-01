// ============================================================
// CHARACTER PARTS — Catalogue SVG (données pures, aucune logique)
// ============================================================

// ---- Teintes de peau ----
export const SKIN_TONES = [
    { id: 'light',        label: 'Claire',        hex: '#FDDBB4', unlockCondition: null },
    { id: 'medium_light', label: 'Médium clair',  hex: '#E8B88A', unlockCondition: null },
    { id: 'medium',       label: 'Médium',        hex: '#C68642', unlockCondition: null },
    { id: 'medium_dark',  label: 'Médium foncé',  hex: '#8D5524', unlockCondition: null },
    { id: 'dark',         label: 'Foncé',         hex: '#4A2912', unlockCondition: null },
    { id: 'very_dark',    label: 'Très foncé',    hex: '#2D1B0E', unlockCondition: null },
];

// ---- Styles d'yeux ----
// svg = éléments SVG complets positionnés dans viewBox 0 0 100 100
// Yeux centrés autour de (38,52) gauche et (62,52) droite
export const EYE_STYLES = [
    {
        id: 'round', label: 'Rond', unlockCondition: null,
        svg: '<circle cx="38" cy="52" r="4" fill="#2C2C2C"/><circle cx="62" cy="52" r="4" fill="#2C2C2C"/><circle cx="39.5" cy="50.5" r="1.5" fill="white"/><circle cx="63.5" cy="50.5" r="1.5" fill="white"/>',
    },
    {
        id: 'almond', label: 'Amande', unlockCondition: null,
        svg: '<ellipse cx="38" cy="52" rx="5" ry="3.5" fill="#2C2C2C"/><ellipse cx="62" cy="52" rx="5" ry="3.5" fill="#2C2C2C"/><ellipse cx="38.5" cy="51" rx="2" ry="1.4" fill="white"/><ellipse cx="62.5" cy="51" rx="2" ry="1.4" fill="white"/>',
    },
    {
        id: 'small', label: 'Petit', unlockCondition: null,
        svg: '<circle cx="38" cy="52" r="2.5" fill="#2C2C2C"/><circle cx="62" cy="52" r="2.5" fill="#2C2C2C"/>',
    },
    {
        id: 'vivid', label: 'Vif', unlockCondition: { type: 'badge', id: 'streak_t2' },
        svg: '<circle cx="38" cy="52" r="5.5" fill="#2C2C2C"/><circle cx="62" cy="52" r="5.5" fill="#2C2C2C"/><circle cx="40" cy="50" r="2" fill="white"/><circle cx="64" cy="50" r="2" fill="white"/><circle cx="36.5" cy="50.5" r="1" fill="white"/><circle cx="60.5" cy="50.5" r="1" fill="white"/>',
    },
    {
        id: 'determined', label: 'Déterminé', unlockCondition: { type: 'rank', rankIndex: 2 },
        svg: '<circle cx="38" cy="53" r="4" fill="#2C2C2C"/><circle cx="62" cy="53" r="4" fill="#2C2C2C"/><circle cx="39.5" cy="51.5" r="1.5" fill="white"/><circle cx="63.5" cy="51.5" r="1.5" fill="white"/><path d="M 32 47 L 44 49.5" stroke="#2C2C2C" stroke-width="2.5" stroke-linecap="round"/><path d="M 56 49.5 L 68 47" stroke="#2C2C2C" stroke-width="2.5" stroke-linecap="round"/>',
    },
    {
        id: 'legendary', label: 'Légendaire', unlockCondition: { type: 'rank', rankIndex: 3 },
        svg: '<ellipse cx="38" cy="53" rx="5" ry="3" fill="#2C2C2C"/><ellipse cx="62" cy="53" rx="5" ry="3" fill="#2C2C2C"/><ellipse cx="38.5" cy="52" rx="2" ry="1.2" fill="white"/><ellipse cx="62.5" cy="52" rx="2" ry="1.2" fill="white"/><path d="M 33 49 Q 38 47 43 49" stroke="#2C2C2C" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M 57 49 Q 62 47 67 49" stroke="#2C2C2C" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
    },
    {
        id: 'sleepy', label: 'Endormi', unlockCondition: { type: 'badge', id: 'nightowl_t3' },
        svg: '<path d="M 33 54 Q 38 58 43 54 Q 38 50 33 54 Z" fill="#2C2C2C"/><path d="M 57 54 Q 62 58 67 54 Q 62 50 57 54 Z" fill="#2C2C2C"/>',
    },
];

// ---- Coiffures ----
// svgBack = rendu AVANT la tête (derrière), svgFront = rendu APRÈS la tête (sur le dessus)
// {COLOR} est remplacé par la couleur hex des cheveux au moment du rendu
export const HAIR_STYLES = [
    {
        id: 'short', label: 'Court', unlockCondition: null,
        svgBack: null,
        svgFront: '<path d="M 20 52 Q 20 20 50 18 Q 80 20 80 52 Q 68 28 50 26 Q 32 28 20 52 Z" fill="{COLOR}"/>',
    },
    {
        id: 'medium', label: 'Mi-long', unlockCondition: null,
        svgBack: null,
        svgFront: '<path d="M 18 65 Q 18 18 50 16 Q 82 18 82 65 L 80 52 Q 68 28 50 26 Q 32 28 20 52 Z" fill="{COLOR}"/>',
    },
    {
        id: 'bun', label: 'Chignon', unlockCondition: null,
        svgBack: null,
        svgFront: '<path d="M 20 52 Q 20 20 50 18 Q 80 20 80 52 Q 68 28 50 26 Q 32 28 20 52 Z" fill="{COLOR}"/><circle cx="50" cy="11" r="8" fill="{COLOR}"/>',
    },
    {
        id: 'braid', label: 'Tresse', unlockCondition: null,
        svgBack: '<path d="M 19 54 Q 14 68 16 84 Q 18 76 20 84 Q 22 76 21 68 Q 24 76 22 85 L 20 88 Q 13 72 14 55 Z" fill="{COLOR}"/>',
        svgFront: '<path d="M 20 52 Q 20 20 50 18 Q 80 20 80 52 Q 68 28 50 26 Q 32 28 20 52 Z" fill="{COLOR}"/>',
    },
    {
        id: 'afro', label: 'Afro', unlockCondition: { type: 'badge', id: 'victories_t3' },
        svgBack: '<ellipse cx="50" cy="36" rx="32" ry="27" fill="{COLOR}"/>',
        svgFront: null,
    },
    {
        id: 'mohawk', label: 'Mohawk', unlockCondition: { type: 'rank', rankIndex: 2 },
        svgBack: null,
        svgFront: '<path d="M 38 44 Q 42 14 50 10 Q 58 14 62 44 Q 56 26 50 22 Q 44 26 38 44 Z" fill="{COLOR}"/>',
    },
    {
        id: 'long', label: 'Longue', unlockCondition: { type: 'badge', id: 'habits_t3' },
        svgBack: '<path d="M 18 56 Q 14 18 50 16 Q 86 18 82 56 Q 84 72 80 94 Q 66 76 50 78 Q 34 76 20 94 Q 16 72 18 56 Z" fill="{COLOR}"/>',
        svgFront: '<path d="M 20 52 Q 20 20 50 18 Q 80 20 80 52 Q 68 28 50 26 Q 32 28 20 52 Z" fill="{COLOR}"/>',
    },
    {
        id: 'ponytail', label: 'Queue de cheval', unlockCondition: { type: 'rank', rankIndex: 3 },
        svgBack: '<path d="M 76 44 Q 82 58 78 75 Q 74 65 76 55 Q 74 65 72 76 L 70 74 Q 72 60 74 48 Z" fill="{COLOR}"/>',
        svgFront: '<path d="M 20 52 Q 20 20 50 18 Q 80 20 80 52 Q 68 28 50 26 Q 32 28 20 52 Z" fill="{COLOR}"/>',
    },
];

// ---- Couleurs de cheveux ----
export const HAIR_COLORS = [
    { id: 'black',  label: 'Noir',  hex: '#1A1A1A', unlockCondition: null },
    { id: 'brown',  label: 'Brun',  hex: '#5C3317', unlockCondition: null },
    { id: 'blonde', label: 'Blond', hex: '#F5D060', unlockCondition: null },
    { id: 'red',    label: 'Roux',  hex: '#C0392B', unlockCondition: null },
    { id: 'white',  label: 'Blanc', hex: '#E8E8E8', unlockCondition: { type: 'rank', rankIndex: 4 } },
    { id: 'blue',   label: 'Bleu',  hex: '#00BFFF', unlockCondition: { type: 'badge', id: 'streak_t3' } },
    { id: 'pink',   label: 'Rose',  hex: '#FF69B4', unlockCondition: { type: 'badge', id: 'collector_t5' } },
];

// ---- Accessoires ----
// svg = null si aucun accessoire
export const ACCESSORIES = [
    {
        id: 'none', label: 'Aucun', unlockCondition: null,
        svg: null,
    },
    {
        id: 'glasses', label: 'Lunettes', unlockCondition: null,
        svg: '<circle cx="38" cy="52" r="7" stroke="#555" stroke-width="1.5" fill="none"/><circle cx="62" cy="52" r="7" stroke="#555" stroke-width="1.5" fill="none"/><path d="M 45 52 L 55 52" stroke="#555" stroke-width="1.5"/><path d="M 22 49 L 31 51" stroke="#555" stroke-width="1.5"/><path d="M 69 51 L 78 49" stroke="#555" stroke-width="1.5"/>',
    },
    {
        id: 'helmet', label: 'Casque', unlockCondition: { type: 'rank', rankIndex: 1 },
        svg: '<path d="M 19 58 Q 19 15 50 14 Q 81 15 81 58 L 81 64 Q 69 60 50 59 Q 31 60 19 64 Z" fill="#888"/><path d="M 19 64 Q 31 68 50 67 Q 69 68 81 64 L 81 68 Q 69 72 50 71 Q 31 72 19 68 Z" fill="#666"/>',
    },
    {
        id: 'headband', label: 'Bandeau', unlockCondition: { type: 'badge', id: 'perfect_t2' },
        svg: '<path d="M 20 44 Q 50 37 80 44 Q 80 49 50 44 Q 20 49 20 44 Z" fill="#E74C3C"/>',
    },
    {
        id: 'scar', label: 'Cicatrice', unlockCondition: { type: 'badge', id: 'victories_t2' },
        svg: '<path d="M 65 54 L 72 66" stroke="#A07070" stroke-width="2.5" stroke-linecap="round"/><path d="M 67 51 L 70 70" stroke="#D4A0A0" stroke-width="1" stroke-linecap="round" stroke-dasharray="2,2"/>',
    },
    {
        id: 'hat', label: 'Chapeau', unlockCondition: { type: 'rank', rankIndex: 2 },
        svg: '<rect x="14" y="48" width="72" height="6" rx="3" fill="#333"/><path d="M 28 48 Q 28 22 50 20 Q 72 22 72 48 Z" fill="#444"/>',
    },
    {
        id: 'crown', label: 'Couronne', unlockCondition: { type: 'rank', rankIndex: 3 },
        svg: '<path d="M 26 40 L 26 24 L 34 32 L 42 16 L 50 26 L 58 16 L 66 32 L 74 24 L 74 40 Q 50 37 26 40 Z" fill="#FFD700" stroke="#FFA500" stroke-width="1.5" stroke-linejoin="round"/>',
    },
];

// ---- Expressions (bouche) ----
export const EXPRESSIONS = [
    {
        id: 'smile', label: 'Sourire', unlockCondition: null,
        svg: '<path d="M 38 68 Q 50 78 62 68" stroke="#2C2C2C" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
    },
    {
        id: 'neutral', label: 'Neutre', unlockCondition: null,
        svg: '<path d="M 38 70 L 62 70" stroke="#2C2C2C" stroke-width="2.5" stroke-linecap="round"/>',
    },
    {
        id: 'determined', label: 'Déterminé', unlockCondition: null,
        svg: '<path d="M 38 71 Q 50 67 62 71" stroke="#2C2C2C" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
    },
    {
        id: 'smirk', label: 'Sourire malin', unlockCondition: { type: 'rank', rankIndex: 1 },
        svg: '<path d="M 40 70 Q 50 76 60 66" stroke="#2C2C2C" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
    },
    {
        id: 'intense', label: 'Intense', unlockCondition: { type: 'badge', id: 'streak_t3' },
        svg: '<path d="M 37 72 Q 50 65 63 72" stroke="#2C2C2C" stroke-width="3" fill="none" stroke-linecap="round"/>',
    },
    {
        id: 'legendary', label: 'Légendaire', unlockCondition: { type: 'rank', rankIndex: 4 },
        svg: '<path d="M 36 68 Q 50 80 64 68 Q 56 74 50 75 Q 44 74 36 68 Z" fill="#2C2C2C"/>',
    },
];

// ---- Config par défaut ----
export const DEFAULT_CONFIG = {
    skinTone:   'medium',
    eyeStyle:   'round',
    hairStyle:  'short',
    hairColor:  'brown',
    accessory:  'none',
    expression: 'smile',
};

// ---- Noms des catégories pour l'affichage ----
export const CATEGORY_LABELS = {
    skinTone:   'Peau',
    eyeStyle:   'Yeux',
    hairStyle:  'Coiffure',
    hairColor:  'Couleur',
    accessory:  'Accessoire',
    expression: 'Expression',
};

// ---- Mapping catégorie → catalogue ----
export const CATALOG_MAP = {
    skinTone:   SKIN_TONES,
    eyeStyle:   EYE_STYLES,
    hairStyle:  HAIR_STYLES,
    hairColor:  HAIR_COLORS,
    accessory:  ACCESSORIES,
    expression: EXPRESSIONS,
};
