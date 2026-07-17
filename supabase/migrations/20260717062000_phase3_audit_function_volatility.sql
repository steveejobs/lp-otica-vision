begin;

alter function private.redact_audit_json(jsonb) stable;

commit;
