type ClassValue = string | false | undefined | null;

export function cx(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
