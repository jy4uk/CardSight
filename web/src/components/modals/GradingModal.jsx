import { useState } from 'react';
import { X, Send, ArrowDownToLine, Loader2 } from 'lucide-react';
import { GRADES } from '../../constants';

const GRADING_COMPANIES = [
  { id: 'psa', label: 'PSA', color: 'bg-red-500 text-white' },
  { id: 'bgs', label: 'BGS', color: 'bg-slate-800 text-white' },
  { id: 'cgc', label: 'CGC', color: 'bg-amber-400 text-amber-950' },
];

export default function GradingModal({ isOpen, item, onClose, onSendForGrading, onReceiveGrade }) {
  const isSent = item?.grading_status === 'submitted';

  const [gradingCompany, setGradingCompany] = useState(isSent ? item?.card_type : 'psa');
  const [gradingCost, setGradingCost] = useState('');
  const [grade, setGrade] = useState('');
  const [gradeQualifier, setGradeQualifier] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen || !item) return null;

  const handleSend = async () => {
    setSaving(true);
    try {
      await onSendForGrading(item.id, {
        grading_company: gradingCompany,
        grading_cost: parseFloat(gradingCost) || 0,
      });
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReceive = async () => {
    if (!grade) {
      alert('Please select the grade received');
      return;
    }
    setSaving(true);
    try {
      await onReceiveGrade(item.id, {
        grade,
        grade_qualifier: gradeQualifier || null,
        front_label_price: newPrice ? parseFloat(newPrice) : null,
        cert_number: certNumber || null,
      });
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const companyLabel = GRADING_COMPANIES.find(c => c.id === (isSent ? item.card_type : gradingCompany))?.label || '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md sm:rounded-xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 ${isSent ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
          <div className="flex items-center gap-2 text-white">
            {isSent ? <ArrowDownToLine className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            <h2 className="text-lg font-bold">{isSent ? 'Received Grade' : 'Send for Grading'}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Card Info */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            {item.image_url ? (
              <img src={item.image_url} alt={item.card_name} className="w-12 h-16 object-cover rounded" />
            ) : (
              <div className="w-12 h-16 bg-slate-200 dark:bg-slate-600 rounded flex items-center justify-center text-xs text-slate-400">No img</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{item.card_name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.set_name || 'Unknown Set'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Current: <span className="font-medium text-emerald-600">${Number(item.front_label_price || 0).toFixed(2)}</span>
                {item.purchase_price && <span className="ml-2">Cost: ${Number(item.purchase_price).toFixed(2)}</span>}
              </p>
            </div>
          </div>

          {!isSent ? (
            <>
              {/* Send for Grading Form */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Grading Company</label>
                <div className="flex gap-2">
                  {GRADING_COMPANIES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setGradingCompany(c.id)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                        gradingCompany === c.id
                          ? `${c.color} ring-2 ring-offset-2 ring-indigo-400`
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Grading Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={gradingCost}
                  onChange={e => setGradingCost(e.target.value)}
                  placeholder="e.g. 30.00"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-400 mt-1">Cost per card for grading service</p>
              </div>

              <button
                onClick={handleSend}
                disabled={saving}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send to {GRADING_COMPANIES.find(c => c.id === gradingCompany)?.label}
              </button>
            </>
          ) : (
            <>
              {/* Receive Grade Form */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Sent to <span className="font-bold">{companyLabel}</span>
                  {item.grading_date_submitted && (
                    <span> on {new Date(item.grading_date_submitted).toLocaleDateString()}</span>
                  )}
                  {item.grading_cost > 0 && (
                    <span> — Cost: <span className="font-semibold">${Number(item.grading_cost).toFixed(2)}</span></span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Grade Received</label>
                <div className="flex items-center gap-3">
                  <select
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select grade</option>
                    {GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  {grade !== '10' && (
                    <button
                      type="button"
                      onClick={() => setGradeQualifier(prev => prev === '.5' ? '' : '.5')}
                      className={`px-3 py-2 border rounded-lg font-medium text-sm transition-colors ${
                        gradeQualifier === '.5'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {gradeQualifier === '.5' ? '.5' : 'Add .5'}
                    </button>
                  )}
                </div>
                {grade && (
                  <p className="text-sm text-slate-500 mt-1">Grade: <span className="font-bold text-slate-900 dark:text-slate-100">{companyLabel} {grade}{gradeQualifier}</span></p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cert Number</label>
                <input
                  type="text"
                  value={certNumber}
                  onChange={e => setCertNumber(e.target.value)}
                  placeholder="e.g. 12345678"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Label Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                  placeholder={`Current: $${Number(item.front_label_price || 0).toFixed(2)}`}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-400 mt-1">Leave blank to keep current price</p>
              </div>

              <button
                onClick={handleReceive}
                disabled={saving || !grade}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
                Confirm Grade Received
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
