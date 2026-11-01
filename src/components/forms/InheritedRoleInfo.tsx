/*
 * SPDX-FileCopyrightText: 2020 Stalwart Labs LLC <hello@stalw.art>
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-SEL
 */

import { useTranslation } from 'react-i18next';
import { Info, Loader2, ShieldCheck } from 'lucide-react';
import { useJmapObject } from '@/data/objects';
import { useFormContext } from '@/components/forms/formContext';
import { ObjectIdValue } from '@/components/values/ScalarValues';
import { cn } from '@/lib/utils';

interface RoleInheritanceDescriptor {
  property: string;
  labelKey: string;
  defaultLabel: string;
}

/**
 * Resolves the configuration property and i18n label for role variants that delegate
 * role assignment to global Authentication singleton settings.
 */
function resolveRoleInheritance(objectName: string, variant: string): RoleInheritanceDescriptor | null {
  // Normalize object name to handle schema definitions both with and without the "x:" prefix
  const normalized = objectName.replace(/^x:/, '');

  // User accounts distinguish standard user roles from system administrator roles
  if (normalized === 'UserRoles') {
    if (variant === 'User') {
      return {
        property: 'defaultUserRoleIds',
        labelKey: 'form.inheritsDefaultUserRoles',
        defaultLabel: 'Inherited default user roles:',
      };
    }
    if (variant === 'Admin') {
      return {
        property: 'defaultAdminRoleIds',
        labelKey: 'form.inheritsDefaultAdminRoles',
        defaultLabel: 'Inherited default administrator roles:',
      };
    }
  }

  // Groups and other directory objects inherit server default group roles
  if (normalized === 'Roles' && variant === 'Default') {
    return {
      property: 'defaultGroupRoleIds',
      labelKey: 'form.inheritsDefaultGroupRoles',
      defaultLabel: 'Inherited default group roles:',
    };
  }

  return null;
}

/**
 * Normalizes role IDs from JMAP representation. In Stalwart's schema, Map<Id>
 * fields are serialized as object maps where keys are IDs and values are booleans
 * (e.g. { "jmap-only": true }), but arrays are handled defensively.
 */
function extractRoleIds(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((id): id is string => typeof id === 'string');
  if (typeof raw === 'object') return Object.keys(raw);
  return [];
}

interface InheritedRoleInfoProps {
  objectName: string;
  variant: string;
  frame?: 'bare' | 'rule' | 'panel';
}

/**
 * Renders an informational banner showing the active roles inherited from server defaults
 * when an account uses standard "User role" or "Administrator role" presets instead of custom roles.
 */
export function InheritedRoleInfo({ objectName, variant, frame = 'panel' }: InheritedRoleInfoProps) {
  const { t } = useTranslation();
  const { schema } = useFormContext();
  const descriptor = resolveRoleInheritance(objectName, variant);

  // Authentication singleton stores server-wide default role IDs configured for users, admins, and groups
  const { data: auth, isLoading } = useJmapObject('x:Authentication', 'singleton');

  if (!descriptor) return null;

  const rawRoles = auth ? auth[descriptor.property] : undefined;
  const roleIds = extractRoleIds(rawRoles);

  return (
    <div
      className={cn(
        frame === 'panel' ? 'py-3' : 'py-2',
        'flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground',
      )}
      role="status"
    >
      <Info className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span>{t(descriptor.labelKey, descriptor.defaultLabel)}</span>
      {isLoading ? (
        <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : roleIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {roleIds.map((id) => (
            <ObjectIdValue key={id} schema={schema} objectName="x:Role" id={id} />
          ))}
        </div>
      ) : (
        <span className="italic">{t('form.noDefaultRolesConfigured', 'None configured')}</span>
      )}
    </div>
  );
}

/**
 * Renders an informational banner indicating that permissions are automatically inherited
 * from assigned roles rather than explicitly overridden on the individual account.
 */
export function InheritedPermissionsInfo({ frame = 'panel' }: { frame?: 'bare' | 'rule' | 'panel' }) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        frame === 'panel' ? 'py-3' : 'py-2',
        'flex items-center gap-2 text-[13px] text-muted-foreground',
      )}
      role="status"
    >
      <ShieldCheck className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span>
        {t('form.permissionsInheritedFromRoles', 'Permissions are automatically inherited from assigned roles.')}
      </span>
    </div>
  );
}
