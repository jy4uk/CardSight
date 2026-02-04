import { useState } from 'react';
import { X, User, Upload, Trash2, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContextNew';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import apiClient from '../utils/apiClient';

export default function AccountSettings({ onClose }) {
  const { user, setUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: user?.firstName || '',
    last_name: user?.lastName || '',
    username: user?.username || '',
    email: user?.email || ''
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Bulk upload state - COMMENTED OUT FOR FUTURE RELEASE
  // const [bulkFile, setBulkFile] = useState(null);
  // const [bulkLoading, setBulkLoading] = useState(false);
  // const [bulkResults, setBulkResults] = useState(null);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);

    try {
      const response = await apiClient.patch('/user/settings', profileForm);
      
      if (response.data.success) {
        // Update user in auth context
        setUser({
          ...user,
          firstName: response.data.user.first_name,
          lastName: response.data.user.last_name,
          username: response.data.user.username,
          email: response.data.user.email
        });
        
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update profile';
      toast.error(message);
    } finally {
      setProfileLoading(false);
    }
  };

  // BULK UPLOAD - COMMENTED OUT FOR FUTURE RELEASE
  // const handleBulkUpload = async () => {
  //   if (!bulkFile) {
  //     toast.error('Please select a CSV file');
  //     return;
  //   }
  //
  //   setBulkLoading(true);
  //   setBulkResults(null);
  //
  //   try {
  //     // Parse CSV file
  //     Papa.parse(bulkFile, {
  //       header: true,
  //       skipEmptyLines: true,
  //       complete: async (results) => {
  //         try {
  //           // Map CSV columns to inventory fields
  //           const items = results.data.map(row => ({
  //             card_name: row.card_name || row['Card Name'] || row.name,
  //             set_name: row.set_name || row['Set Name'] || row.set,
  //             card_number: row.card_number || row['Card Number'] || row.number,
  //             game: row.game || 'pokemon',
  //             card_type: row.card_type || row['Card Type'] || 'raw',
  //             purchase_price: parseFloat(row.purchase_price || row['Purchase Price'] || 0),
  //             front_label_price: parseFloat(row.front_label_price || row['Front Label Price'] || row.price || 0),
  //             condition: row.condition || 'NM',
  //             quantity: parseInt(row.quantity || 1),
  //             barcode_id: row.barcode_id || row['Barcode ID'] || row.barcode || '',
  //             cert_number: row.cert_number || row['Cert Number'] || '',
  //             grade: row.grade || '',
  //             purchase_date: row.purchase_date || row['Purchase Date'] || new Date().toISOString().split('T')[0]
  //           }));
  //
  //           // Send to backend
  //           const response = await apiClient.post('/inventory/bulk', { items });
  //           
  //           if (response.data.success) {
  //             setBulkResults(response.data.results);
  //             toast.success(response.data.message);
  //             
  //             // Clear file input
  //             setBulkFile(null);
  //             const fileInput = document.getElementById('bulk-file-input');
  //             if (fileInput) fileInput.value = '';
  //           }
  //         } catch (error) {
  //           const message = error.response?.data?.error || 'Failed to upload inventory';
  //           toast.error(message);
  //         } finally {
  //           setBulkLoading(false);
  //         }
  //       },
  //       error: (error) => {
  //         toast.error('Failed to parse CSV file: ' + error.message);
  //         setBulkLoading(false);
  //       }
  //     });
  //   } catch (error) {
  //     toast.error('Failed to process file');
  //     setBulkLoading(false);
  //   }
  // };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password to confirm');
      return;
    }

    setDeleteLoading(true);

    try {
      const response = await apiClient.delete('/user/account', {
        data: { password: deletePassword }
      });

      if (response.data.success) {
        toast.success('Account deleted successfully');
        // Logout and close modal
        await logout();
        onClose();
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete account';
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `card_name,set_name,card_number,game,card_type,purchase_price,front_label_price,condition,quantity,barcode_id,cert_number,grade,purchase_date
Charizard,Base Set,4,pokemon,raw,50.00,100.00,NM,1,,,,"2024-01-01"
Pikachu,Base Set,58,pokemon,psa,25.00,75.00,PSA 10,1,,12345678,10,"2024-01-01"`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 id="settings-title" className="text-2xl font-bold text-gray-900">Account Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors touch-target"
            aria-label="Close account settings"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" role="tablist" aria-label="Account settings sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            aria-controls="profile-panel"
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 font-medium transition-colors touch-target ${
              activeTab === 'profile'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" aria-hidden="true" />
            Profile
          </button>
          {/* BULK UPLOAD TAB - COMMENTED OUT FOR FUTURE RELEASE
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bulk'}
            aria-controls="bulk-panel"
            onClick={() => setActiveTab('bulk')}
            className={`px-6 py-3 font-medium transition-colors touch-target ${
              activeTab === 'bulk'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" aria-hidden="true" />
            Bulk Upload
          </button>
          */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'danger'}
            aria-controls="danger-panel"
            onClick={() => setActiveTab('danger')}
            className={`px-6 py-3 font-medium transition-colors touch-target ${
              activeTab === 'danger'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" aria-hidden="true" />
            Danger Zone
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div role="tabpanel" id="profile-panel" aria-labelledby="profile-tab">
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      id="first-name"
                      type="text"
                      value={profileForm.first_name}
                      onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-target"
                    />
                  </div>

                  <div>
                    <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      id="last-name"
                      type="text"
                      value={profileForm.last_name}
                      onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-target"
                    />
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-target"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used in your public profile URL: /u/{profileForm.username || 'your-username'}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-target"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                    aria-busy={profileLoading}
                  >
                    {profileLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" aria-hidden="true" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* BULK UPLOAD TAB CONTENT - COMMENTED OUT FOR FUTURE RELEASE
          {activeTab === 'bulk' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">How to use Bulk Upload</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Download the CSV template below</li>
                  <li>Fill in your inventory data (one card per row)</li>
                  <li>Upload the completed CSV file</li>
                  <li>Review the results and fix any errors</li>
                </ol>
              </div>

              <div>
                <button
                  onClick={downloadTemplate}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm underline"
                >
                  Download CSV Template
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV File
                </label>
                <input
                  id="bulk-file-input"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setBulkFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleBulkUpload}
                  disabled={!bulkFile || bulkLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Inventory
                    </>
                  )}
                </button>
              </div>

              {bulkResults && (
                <div className="mt-6 space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">
                      ✓ Successfully added {bulkResults.success.length} items
                    </h4>
                  </div>

                  {bulkResults.failed.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 mb-2">
                        ✗ Failed to add {bulkResults.failed.length} items
                      </h4>
                      <div className="max-h-40 overflow-y-auto">
                        {bulkResults.failed.map((fail, idx) => (
                          <div key={idx} className="text-sm text-red-800 mt-1">
                            Row {fail.index + 1}: {fail.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          */}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Danger Zone
                </h3>
                <p className="text-sm text-red-800">
                  Deleting your account is permanent and cannot be undone. All your inventory, trades, and data will be permanently deleted.
                </p>
              </div>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              ) : (
                <div className="space-y-4 bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900">Confirm Account Deletion</h4>
                  <p className="text-sm text-gray-600">
                    Please enter your password to confirm you want to delete your account.
                  </p>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading || !deletePassword}
                      className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Yes, Delete My Account
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeletePassword('');
                      }}
                      disabled={deleteLoading}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
