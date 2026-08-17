# Collaborative client cases

The collaborative workspace adds private file uploads, custom checklist items,
assignments and email-bound invitation links to `moje-sprawy.html`.

## Apply the migration

Run `supabase/migrations/20260818010000_collaborative_case_workspace.sql` in
the Supabase SQL editor after the earlier client-cases migration.

The migration creates:

- `client_case_participants` for owners and invited collaborators;
- `client_case_items` for template and custom documents/tasks;
- `client_case_files` for private-file metadata;
- the private `case-documents` Storage bucket with a 10 MB limit;
- RLS policies and RPCs for creating and accepting invitations.

No additional frontend environment variables are required.

## Authentication URLs

Keep these URLs in **Authentication → URL Configuration → Redirect URLs**:

```text
https://kancelio.pl/moje-sprawy.html
https://kancelio.pl/moje-sprawy.html?invite=*
```

If Supabase does not accept wildcard query parameters, the first URL is enough:
the pending invitation token is also retained in browser session storage during
OAuth.

## Invitation behavior

The app does not send email. An owner enters the collaborator's email and role,
then copies or shares the generated link. The link:

- expires after 7 days;
- can be accepted only by a user signed in with the exact invited email;
- is cleared after acceptance;
- grants access only to the selected case and its private files.

## Storage and privacy

Allowed files are PDF, JPG, PNG, TXT, DOC and DOCX, up to 10 MB each. Storage is
private; the app generates a short-lived signed URL when an authorized
participant opens a file. Review the updated privacy policy before deployment.

## Deployment order

1. Apply the new Supabase migration.
2. Verify that the `case-documents` bucket is private.
3. Deploy the frontend.
4. Test with two different email accounts: owner creates a case and invitation,
   collaborator accepts it, both update an item, and both open an uploaded file.
