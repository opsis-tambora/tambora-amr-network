import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings2, UserPlus, Trash2, Smartphone } from 'lucide-react';

const Settings = () => {
  const [recipients, setRecipients] = useState([]);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState('individual');

  const fetchRecipients = () => {
    axios.get('/api/recipients')
      .then(res => setRecipients(res.data))
      .catch(err => console.error("Failed to load recipients", err));
  };

  useEffect(() => {
    fetchRecipients();
  }, []);

  const handleAddRecipient = async (e) => {
    e.preventDefault();
    try {
      // 👇 Only remove characters that are NOT numbers or hyphens (Group IDs sometimes have hyphens)
      const formattedPhone = newPhone.replace(/[^\d-]/g, ''); 
      await axios.post('/api/recipients', { name: newName, phone: formattedPhone, type: newType });
      setNewName('');
      setNewPhone('');
      setNewType('individual'); // Reset dropdown
      fetchRecipients();
    } catch (error) {
      alert("Failed to add recipient. Number might already exist.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remove this person from WhatsApp alerts?")) {
      try {
        await axios.delete(`/api/recipients/${id}`);
        fetchRecipients();
      } catch (error) {
        alert("Failed to delete recipient");
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center gap-3">
        <Settings2 className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-bold text-white tracking-wide">System Configuration</h2>
      </div>

      <div className="p-6">
        <h3 className="text-md font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Smartphone className="w-4 h-4" /> WhatsApp Alert Recipients
        </h3>
        
        {/* Add Form */}
        <form onSubmit={handleAddRecipient} className="flex gap-4 mb-8 bg-slate-950 p-4 rounded-lg border border-slate-800 items-start">
          
          <select 
            value={newType} 
            onChange={e => setNewType(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 font-semibold w-40"
          >
            <option value="individual">👤 Person</option>
            <option value="group">👥 Group</option>
          </select>

          <input 
            type="text" required placeholder={newType === 'group' ? "Group Name" : "Engineer Name"} 
            value={newName} onChange={e => setNewName(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500" 
          />
          <input 
            type="text" required placeholder={newType === 'group' ? "Group ID (e.g., 120363411...)" : "Phone Number"} 
            value={newPhone} onChange={e => setNewPhone(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono focus:border-blue-500" 
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors">
            <UserPlus className="w-4 h-4" /> Add
          </button>
        </form>

        {/* Recipients List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recipients.length === 0 ? (
            <p className="text-slate-500 italic col-span-2">No recipients configured. Alerts will not be sent.</p>
          ) : (
            recipients.map(person => (
              <div key={person.id} className="flex justify-between items-center bg-slate-800/50 border border-slate-700 p-4 rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{person.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 uppercase">
                      {person.type}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 font-mono mt-1">
                    {person.type === 'individual' ? '+' : ''}{person.phone}
                  </div>
                </div>
                <button onClick={() => handleDelete(person.id)} className="p-2 text-rose-400 hover:bg-rose-500/20 rounded transition-colors" title="Remove">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;