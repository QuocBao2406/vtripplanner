BEGIN;

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  default_user_role_id uuid;
BEGIN
  INSERT INTO public.roles (
    "name",
    "description",
    "isActive",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    'USER'::public."AppRole",
    'Default application user',
    true,
    now(),
    now()
  )
  ON CONFLICT ("name")
  DO UPDATE SET
    "isActive" = true,
    "updatedAt" = now()
  RETURNING id
  INTO default_user_role_id;

  INSERT INTO public.users (
    id,
    email,
    "isActive",
    "lastLoginAt",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    NEW.id,
    NEW.email,
    true,
    NEW.last_sign_in_at,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id)
  DO UPDATE SET
    email = EXCLUDED.email,
    "lastLoginAt" = COALESCE(
      EXCLUDED."lastLoginAt",
      public.users."lastLoginAt"
    ),
    "updatedAt" = now();

  INSERT INTO public.user_profiles (
    "userId",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    NEW.id,
    now(),
    now()
  )
  ON CONFLICT ("userId")
  DO NOTHING;

  INSERT INTO public.user_consents (
    "userId",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    NEW.id,
    now(),
    now()
  )
  ON CONFLICT ("userId")
  DO NOTHING;

  INSERT INTO public.user_preferences (
    "userId",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    NEW.id,
    now(),
    now()
  )
  ON CONFLICT ("userId")
  DO NOTHING;

  INSERT INTO public.user_roles (
    "userId",
    "roleId"
  )
  VALUES (
    NEW.id,
    default_user_role_id
  )
  ON CONFLICT ("userId", "roleId")
  DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_sync_public_data
ON auth.users;

CREATE TRIGGER on_auth_user_sync_public_data
AFTER INSERT OR UPDATE OF email, last_sign_in_at
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_user_to_public();

INSERT INTO public.roles (
  "name",
  "description",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES (
  'USER'::public."AppRole",
  'Default application user',
  true,
  now(),
  now()
)
ON CONFLICT ("name")
DO UPDATE SET
  "isActive" = true,
  "updatedAt" = now();

INSERT INTO public.users (
  id,
  email,
  "isActive",
  "lastLoginAt",
  "createdAt",
  "updatedAt"
)
SELECT
  auth_user.id,
  auth_user.email,
  true,
  auth_user.last_sign_in_at,
  COALESCE(auth_user.created_at, now()),
  now()
FROM auth.users AS auth_user
ON CONFLICT (id)
DO UPDATE SET
  email = EXCLUDED.email,
  "lastLoginAt" = COALESCE(
    EXCLUDED."lastLoginAt",
    public.users."lastLoginAt"
  ),
  "updatedAt" = now();

INSERT INTO public.user_profiles (
  "userId",
  "createdAt",
  "updatedAt"
)
SELECT
  auth_user.id,
  COALESCE(auth_user.created_at, now()),
  now()
FROM auth.users AS auth_user
ON CONFLICT ("userId")
DO NOTHING;

INSERT INTO public.user_consents (
  "userId",
  "createdAt",
  "updatedAt"
)
SELECT
  auth_user.id,
  COALESCE(auth_user.created_at, now()),
  now()
FROM auth.users AS auth_user
ON CONFLICT ("userId")
DO NOTHING;

INSERT INTO public.user_preferences (
  "userId",
  "createdAt",
  "updatedAt"
)
SELECT
  auth_user.id,
  COALESCE(auth_user.created_at, now()),
  now()
FROM auth.users AS auth_user
ON CONFLICT ("userId")
DO NOTHING;

INSERT INTO public.user_roles (
  "userId",
  "roleId"
)
SELECT
  auth_user.id,
  application_role.id
FROM auth.users AS auth_user
CROSS JOIN public.roles AS application_role
WHERE application_role.name::text = 'USER'
ON CONFLICT ("userId", "roleId")
DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.roles AS application_role
    WHERE
      application_role.name::text = 'USER'
      AND application_role."isActive" = true
  ) THEN
    RAISE EXCEPTION
      'Active USER role was not created.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM auth.users AS auth_user
    LEFT JOIN public.users AS application_user
      ON application_user.id = auth_user.id
    WHERE application_user.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Some auth users are missing from public.users.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM auth.users AS auth_user
    LEFT JOIN public.user_profiles AS user_profile
      ON user_profile."userId" = auth_user.id
    WHERE user_profile."userId" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Some auth users are missing user profiles.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM auth.users AS auth_user
    LEFT JOIN public.user_consents AS user_consent
      ON user_consent."userId" = auth_user.id
    WHERE user_consent."userId" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Some auth users are missing user consents.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM auth.users AS auth_user
    LEFT JOIN public.user_preferences AS user_preference
      ON user_preference."userId" = auth_user.id
    WHERE user_preference."userId" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Some auth users are missing user preferences.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM auth.users AS auth_user
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.user_roles AS user_role
      INNER JOIN public.roles AS application_role
        ON application_role.id = user_role."roleId"
      WHERE
        user_role."userId" = auth_user.id
        AND application_role.name::text = 'USER'
    )
  ) THEN
    RAISE EXCEPTION
      'Some auth users are missing the USER role.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE
      tgname = 'on_auth_user_sync_public_data'
      AND tgrelid = 'auth.users'::regclass
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION
      'Auth user synchronization trigger was not created.';
  END IF;
END;
$$;

COMMIT;