import { getChildNames } from "./children-store";

/** @deprecated Use useChildren() or getChildNames() */
export function getChildrenList(): string[] {
  return getChildNames();
}
