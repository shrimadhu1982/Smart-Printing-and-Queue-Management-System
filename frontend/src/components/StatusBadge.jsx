import React from 'react';
import { Clock, CheckCircle2, AlertTriangle, Printer, Check, XCircle, Ban } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  const norm = (status || 'pending').toLowerCase();

  switch (norm) {
    case 'pending':
      return (
        <span className="badge badge-pending">
          <Clock size={13} />
          Pending
        </span>
      );
    case 'accepted':
      return (
        <span className="badge badge-accepted">
          <Check size={13} />
          Accepted
        </span>
      );
    case 'printing':
      return (
        <span className="badge badge-printing">
          <Printer size={13} />
          Printing
        </span>
      );
    case 'completed':
      return (
        <span className="badge badge-completed">
          <CheckCircle2 size={13} />
          Completed
        </span>
      );
    case 'rejected':
      return (
        <span className="badge badge-rejected">
          <XCircle size={13} />
          Rejected
        </span>
      );
    case 'cancelled':
      return (
        <span className="badge badge-cancelled">
          <Ban size={13} />
          Cancelled
        </span>
      );
    default:
      return <span className="badge">{status}</span>;
  }
};
