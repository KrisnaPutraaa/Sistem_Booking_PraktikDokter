import { formatInTimeZone } from "date-fns-tz";
import { id as localeId } from "date-fns/locale/id";
import { connection } from "next/server";
import { Suspense } from "react";
import { MySecurityCard, PasswordCard, StaffAccountsCard } from "@/components/staff/account-cards";
import { StaffHeader, StaffTabs } from "@/components/staff/staff-header";
import { listStaffAccounts } from "@/lib/staff/accounts";
import { recoveryCodesRemaining } from "@/lib/staff/mfa.server";
import { canManageStaff } from "@/lib/staff/roles";
import { requireStaff } from "@/lib/staff/session";
import { emailToUsername } from "@/lib/staff/username";
import { APP_TIMEZONE } from "@/lib/time";

export default function AkunPage() {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  await connection();
  const staff = await requireStaff();
  const hasMfa = staff.verifiedFactorIds.length > 0;
  const [codesRemaining, accounts] = await Promise.all([
    hasMfa ? recoveryCodesRemaining(staff.userId) : Promise.resolve(null),
    canManageStaff(staff.role) ? listStaffAccounts(staff) : Promise.resolve(null),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1330px] px-4 py-6 sm:px-6">
      <StaffHeader staff={staff} />
      <div className="mt-6">
        <StaffTabs role={staff.role} active="account" />
      </div>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid min-w-0 gap-6">
          <MySecurityCard
            fullName={staff.fullName}
            username={displayUsername(staff.email)}
            role={staff.role}
            hasMfa={hasMfa}
            mfaRequired={staff.mfaRequired}
            codesRemaining={codesRemaining}
          />
          {accounts ? (
            <StaffAccountsCard
              accounts={accounts.map((a) => ({
                id: a.id,
                fullName: a.fullName,
                role: a.role,
                username: displayUsername(a.email),
                hasMfa: a.hasMfa,
                disabled: a.disabled,
                lastSignIn: a.lastSignInAt
                  ? formatInTimeZone(new Date(a.lastSignInAt), APP_TIMEZONE, "d MMM yyyy, HH.mm", { locale: localeId })
                  : "Belum pernah",
                isSelf: a.id === staff.userId,
              }))}
            />
          ) : null}
        </div>
        <PasswordCard />
      </div>
    </main>
  );
}

/** Akun lama yang belum dipetakan tetap tampil dengan emailnya. */
function displayUsername(email: string): string {
  return emailToUsername(email) ?? `${email} (belum dipetakan)`;
}

function AccountSkeleton() {
  return (
    <main aria-busy="true" aria-label="Memuat akun" className="mx-auto w-full max-w-[1330px] animate-pulse px-6 py-6">
      <div className="h-8 w-64 rounded bg-staff-line" />
      <div className="mt-6 h-96 rounded-box bg-staff-line" />
    </main>
  );
}
