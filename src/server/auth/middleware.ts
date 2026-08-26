import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from './crypto.js';
import type { BeneficiaryTokenPayload, StaffTokenPayload, StaffRole, Pillar } from '../../types/index.js';

// Extend Express Request interface with Auth properties
declare global {
  namespace Express {
    interface Request {
      beneficiaryId?: string;
      beneficiaryPayload?: BeneficiaryTokenPayload;
      staffId?: string;
      staffRole?: StaffRole;
      pillarScope?: Pillar | null;
      staffPayload?: StaffTokenPayload;
    }
  }
}

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  return null;
}

/**
 * Middleware: Requires an authenticated Beneficiary JWT
 */
export function requireBeneficiaryAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  if (payload.type !== 'beneficiary') {
    return res.status(403).json({ error: 'Forbidden: Beneficiary credentials required.' });
  }

  req.beneficiaryId = payload.beneficiary_id;
  req.beneficiaryPayload = payload as BeneficiaryTokenPayload;
  next();
}

/**
 * Middleware: Requires an authenticated Staff JWT with one of the allowed roles
 */
export function requireStaffRole(...allowedRoles: StaffRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    if (payload.type !== 'staff') {
      return res.status(403).json({ error: 'Forbidden: Internal Staff credentials required.' });
    }

    const staffPayload = payload as StaffTokenPayload;

    if (allowedRoles.length > 0 && !allowedRoles.includes(staffPayload.role)) {
      return res.status(403).json({
        error: `Forbidden: Role '${staffPayload.role}' is not authorized to access this resource. Required: ${allowedRoles.join(', ')}`,
      });
    }

    req.staffId = staffPayload.staff_id;
    req.staffRole = staffPayload.role;
    req.pillarScope = staffPayload.pillar_scope || null;
    req.staffPayload = staffPayload;
    next();
  };
}
