'use client';

import { useState } from 'react';
import { useAdminData } from '@/components/admin/useAdminData';

interface StaffMember {
  uid: string;
  email: string;
  displayName: string;
  role: 'superadmin' | 'admin' | 'warehouse';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastLoginAt?: string;
}

export default function AdminStaffPage() {
  const { data: me } = useAdminData<{ uid: string; role: string }>('/api/admin/me');
  const { data, loading, error, reload } = useAdminData<{ staff: StaffMember[] }>('/api/admin/staff');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalUser, setEditModalUser] = useState<StaffMember | null>(null);

  // Create form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'superadmin' | 'admin' | 'warehouse'>('warehouse');
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit form state
  const [editRole, setEditRole] = useState<'superadmin' | 'admin' | 'warehouse'>('warehouse');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');

  // Post-create success card state
  const [newCredentials, setNewCredentials] = useState<{
    email: string;
    role: string;
    pass: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  function generateRandomPassword() {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%^&*';
    const all = uppers + lowers + digits + symbols;

    const res = [
      uppers[Math.floor(Math.random() * uppers.length)],
      uppers[Math.floor(Math.random() * uppers.length)],
      lowers[Math.floor(Math.random() * lowers.length)],
      lowers[Math.floor(Math.random() * lowers.length)],
      digits[Math.floor(Math.random() * digits.length)],
      digits[Math.floor(Math.random() * digits.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];

    while (res.length < 14) {
      res.push(all[Math.floor(Math.random() * all.length)]);
    }

    return res.sort(() => 0.5 - Math.random()).join('');
  }

  function validatePassword(p: string): string | null {
    if (p.length < 10) return 'Password must be at least 10 characters long.';
    if (!/[A-Z]/.test(p)) return 'Password must contain at least one uppercase letter (A-Z).';
    if (!/[a-z]/.test(p)) return 'Password must contain at least one lowercase letter (a-z).';
    if (!/[0-9]/.test(p)) return 'Password must contain at least one number (0-9).';
    if (!/[^A-Za-z0-9]/.test(p)) return 'Password must contain at least one special character (!@#$%^&*).';
    return null;
  }

  function openCreateModal() {
    setName('');
    setEmail('');
    setPassword(generateRandomPassword());
    setRole('warehouse');
    setFormError(null);
    setNewCredentials(null);
    setCreateModalOpen(true);
  }

  function openEditModal(member: StaffMember) {
    setEditModalUser(member);
    setEditRole(member.role);
    setEditIsActive(member.isActive);
    setEditDisplayName(member.displayName || '');
    setEditPassword('');
    setFormError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setFormError('Please provide email and password.');
      return;
    }
    const passErr = validatePassword(password);
    if (passErr) {
      setFormError(passErr);
      return;
    }
    setFormBusy(true);
    setFormError(null);

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          displayName: name.trim() || undefined,
          role,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Failed to create staff account');
      }

      setNewCredentials({
        email: email.trim().toLowerCase(),
        role,
        pass: password,
      });
      reload();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while creating staff member.');
    } finally {
      setFormBusy(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editModalUser) return;

    if (editPassword.trim()) {
      const passErr = validatePassword(editPassword.trim());
      if (passErr) {
        setFormError(passErr);
        return;
      }
    }

    setFormBusy(true);
    setFormError(null);

    try {
      const payload: Record<string, any> = {
        role: editRole,
        isActive: editIsActive,
        displayName: editDisplayName.trim(),
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`/api/admin/staff/${editModalUser.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Failed to update staff member');
      }

      setEditModalUser(null);
      reload();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while updating staff member.');
    } finally {
      setFormBusy(false);
    }
  }

  async function handleDelete(member: StaffMember) {
    if (member.uid === me?.uid) {
      alert('You cannot delete your own account.');
      return;
    }
    const confirmed = confirm(
      `Are you sure you want to permanently delete the staff account for "${member.email}"?\nThey will immediately lose access.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/staff/${member.uid}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || json.message || 'Failed to delete staff member');
      }
      reload();
    } catch (err: any) {
      alert(err.message || 'Could not delete staff member.');
    }
  }

  function copyLoginDetails() {
    if (!newCredentials) return;
    const text = `EVM Official Staff Login Details:
Portal URL: ${window.location.origin}/staff-login
Email: ${newCredentials.email}
Password: ${newCredentials.pass}
Assigned Role: ${newCredentials.role === 'warehouse' ? 'Dispatch / Warehouse Team' : newCredentials.role}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const staffList = data?.staff || [];
  const superadminCount = staffList.filter((s) => s.role === 'superadmin').length;
  const adminCount = staffList.filter((s) => s.role === 'admin').length;
  const dispatchCount = staffList.filter((s) => s.role === 'warehouse').length;

  if (loading && !data) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        Loading staff and access control list…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <h2 className="font-semibold text-red-900">Access Restricted</h2>
        <p className="mt-1">
          Only Superadmins have permission to view and manage staff credentials and roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Staff &amp; Role Management</h1>
          <p className="text-xs text-gray-500 mt-1">
            Superadmin panel to create and manage Superadmins, Store Admins, and Dispatch / Warehouse fulfillment team logins.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 transition"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Staff Member
        </button>
      </div>

      {/* Role Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Total Staff</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{staffList.length}</p>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-purple-900">Superadmins</p>
            <span className="rounded-full bg-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-800">Full Access</span>
          </div>
          <p className="text-2xl font-bold text-purple-950 mt-1">{superadminCount}</p>
          <p className="text-[11px] text-purple-700 mt-1">Can create users &amp; manage all data</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-900">Store Admins</p>
            <span className="rounded-full bg-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">Catalog &amp; Orders</span>
          </div>
          <p className="text-2xl font-bold text-blue-950 mt-1">{adminCount}</p>
          <p className="text-[11px] text-blue-700 mt-1">Catalog, reels, orders &amp; payments</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-900">Dispatch Team</p>
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">Warehouse Only</span>
          </div>
          <p className="text-2xl font-bold text-amber-950 mt-1">{dispatchCount}</p>
          <p className="text-[11px] text-amber-700 mt-1">Fulfillment, labels &amp; invoice printing</p>
        </div>
      </div>

      {/* Staff Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
          <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Staff Member</th>
              <th className="px-4 py-3">Assigned Role</th>
              <th className="px-4 py-3">Access Level</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {staffList.map((member) => {
              const isCurrentUser = member.uid === me?.uid;
              return (
                <tr key={member.uid} className="hover:bg-gray-50/80 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {member.displayName?.charAt(0) || member.email.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                          {member.displayName || 'Staff User'}
                          {isCurrentUser && (
                            <span className="rounded bg-gray-200 px-1.5 py-0.2 text-[10px] font-medium text-gray-700">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500 font-mono text-[11px]">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {member.role === 'superadmin' && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                        👑 Superadmin
                      </span>
                    )}
                    {member.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                        🛡️ Store Admin
                      </span>
                    )}
                    {member.role === 'warehouse' && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        📦 Dispatch / Warehouse
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {member.role === 'superadmin' && 'Full system control + Staff management'}
                    {member.role === 'admin' && 'Products, reels, categories, orders & payments'}
                    {member.role === 'warehouse' && 'Orders, labels, parcel stickers & invoices only'}
                  </td>
                  <td className="px-4 py-3">
                    {member.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                        ● Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 border border-red-200">
                        ✕ Suspended
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(member)}
                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit / Reset
                      </button>
                      {!isCurrentUser && (
                        <button
                          type="button"
                          onClick={() => handleDelete(member)}
                          className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            {newCredentials ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Staff Account Created Successfully!</h3>
                    <p className="text-xs text-gray-500">Share the credentials below with the team member.</p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Portal Login:</span>
                    <span className="font-semibold text-gray-900">{window.location.origin}/staff-login</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="font-semibold text-gray-900">{newCredentials.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Password:</span>
                    <span className="font-semibold text-gray-900">{newCredentials.pass}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Role:</span>
                    <span className="font-semibold text-gray-900">
                      {newCredentials.role === 'warehouse'
                        ? 'Dispatch / Warehouse Team (Fulfillment Only)'
                        : newCredentials.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={copyLoginDetails}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                  >
                    {copied ? '✓ Copied to Clipboard!' : 'Copy Login Details'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalOpen(false);
                      setNewCredentials(null);
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Create Staff Login</h3>
                    <p className="text-xs text-gray-500">Create a Superadmin, Store Admin, or Dispatch team account.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name / Member Identifier</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Warehouse Hub 1 (Bhiwandi)"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. dispatch.warehouse@evmzone.com"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Password (Min 10 chars) *</label>
                    <button
                      type="button"
                      onClick={() => setPassword(generateRandomPassword())}
                      className="text-[11px] font-medium text-gray-600 underline hover:text-gray-900"
                    >
                      Generate Secure Password
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={10}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="e.g. EvmZone@2026! (min 10 chars)"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-14 text-xs font-mono text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-900 px-1"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Must be at least 10 characters and include an uppercase letter, a number, and a special character (!@#$%^&*).
                  </p>
                </div>

                {/* Role selection cards */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Select Assigned Role *</label>
                  <div className="space-y-2">
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        role === 'warehouse'
                          ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="warehouse"
                        checked={role === 'warehouse'}
                        onChange={() => setRole('warehouse')}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900">📦 Dispatch / Warehouse Team (Fulfillment Only)</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Access restricted exclusively to <strong>Orders &amp; Dispatch</strong>. Can print custom thermal parcel stickers, packing slips, tax invoices, and mark dispatch. Blocked from catalog, prices, and settings.
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        role === 'admin'
                          ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={role === 'admin'}
                        onChange={() => setRole('admin')}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900">🛡️ Store Admin</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Can manage catalog, products, prices, categories, brand reels, orders, and view payments. Cannot create or edit other staff accounts.
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        role === 'superadmin'
                          ? 'border-purple-500 bg-purple-50/40 ring-1 ring-purple-500'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="superadmin"
                        checked={role === 'superadmin'}
                        onChange={() => setRole('superadmin')}
                        className="mt-0.5 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900">👑 Superadmin</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Full system control. Can create more Superadmins, dispatch team logins, view audit logs, issue refunds, and configure the entire store.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formBusy}
                    className="rounded-lg bg-gray-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50"
                  >
                    {formBusy ? 'Creating Account…' : 'Create Staff Member'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Edit Staff Member</h3>
                  <p className="text-xs text-gray-500">{editModalUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditModalUser(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Role</label>
                <select
                  value={editRole}
                  disabled={editModalUser.uid === me?.uid}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-900"
                >
                  <option value="warehouse">📦 Dispatch / Warehouse Team (Orders &amp; Shipping Only)</option>
                  <option value="admin">🛡️ Store Admin (Catalog &amp; Orders)</option>
                  <option value="superadmin">👑 Superadmin (Full Access)</option>
                </select>
                {editModalUser.uid === me?.uid && (
                  <p className="text-[11px] text-gray-500 mt-1">You cannot change your own superadmin role.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Account Status</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={editIsActive}
                      disabled={editModalUser.uid === me?.uid}
                      onChange={() => setEditIsActive(true)}
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={!editIsActive}
                      disabled={editModalUser.uid === me?.uid}
                      onChange={() => setEditIsActive(false)}
                    />
                    Suspended (Disable Login)
                  </label>
                </div>
                {editModalUser.uid === me?.uid && (
                  <p className="text-[11px] text-gray-500 mt-1">You cannot suspend your own account.</p>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reset Password (Leave blank to keep unchanged)
                </label>
                <div className="relative">
                  <input
                    type={editShowPassword ? 'text' : 'password'}
                    minLength={10}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Enter new password (min 10 chars)"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-14 text-xs font-mono text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => setEditShowPassword(!editShowPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-900 px-1"
                  >
                    {editShowPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Must be at least 10 characters with an uppercase letter, a number, and a special character (!@#$%^&*).
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditModalUser(null)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formBusy}
                  className="rounded-lg bg-gray-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  {formBusy ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
