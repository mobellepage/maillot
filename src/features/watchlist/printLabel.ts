// The print wanted on a wished kit, e.g. "KAKÁ 22".
export const printLabel = (k: { print_name?: string | null; print_number?: string | null }) => [k.print_name?.toUpperCase(), k.print_number].filter(Boolean).join(' ');
