/**
 * User domain entity.
 * Zero external imports — this is pure domain.
 */
export interface User {
  /** UUID v4 */
  id: string;
  /** Unique email address */
  email: string;
  /** Display name */
  name: string;
}

