/**
 * Modal pour gérer les profils de température (hotend et plateau)
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface TemperatureProfile {
  id: string;
  name: string;
  value: number;
  type: 'hotend' | 'bed';
}

interface TemperatureProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: TemperatureProfile[];
  onSaveProfiles: (profiles: TemperatureProfile[]) => void;
}

export const TemperatureProfilesModal: React.FC<TemperatureProfilesModalProps> = ({
  isOpen,
  onClose,
  profiles,
  onSaveProfiles,
}) => {
  const { t } = useTranslation();
  const [localProfiles, setLocalProfiles] = useState<TemperatureProfile[]>(profiles);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileValue, setNewProfileValue] = useState<number>(200);
  const [newProfileType, setNewProfileType] = useState<'hotend' | 'bed'>('hotend');

  // Synchronize local state when profiles prop changes
  useEffect(() => {
    setLocalProfiles(profiles);
  }, [profiles]);

  if (!isOpen) return null;

  const handleAddProfile = () => {
    if (!newProfileName.trim()) return;

    const newProfile: TemperatureProfile = {
      id: Date.now().toString(),
      name: newProfileName.trim(),
      value: newProfileValue,
      type: newProfileType,
    };

    setLocalProfiles([...localProfiles, newProfile]);
    setNewProfileName('');
    setNewProfileValue(newProfileType === 'hotend' ? 200 : 60);
  };

  const handleDeleteProfile = (id: string) => {
    setLocalProfiles(localProfiles.filter(p => p.id !== id));
  };

  const handleUpdateProfile = (id: string, field: 'name' | 'value' | 'type', value: string | number) => {
    setLocalProfiles(
      localProfiles.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSave = () => {
    onSaveProfiles(localProfiles);
    onClose();
  };

  const hotendProfiles = localProfiles.filter(p => p.type === 'hotend');
  const bedProfiles = localProfiles.filter(p => p.type === 'bed');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-bold text-gray-900">
              {t('temperatureProfiles.title', 'Profils de température')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* Hotend Profiles */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-orange-800 mb-2">
              {t('control.hotend', 'Hotend')}
            </h3>
            <div className="space-y-2">
              {hotendProfiles.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-2">
                  {t('temperatureProfiles.noProfiles', 'Aucun profil défini')}
                </p>
              )}
              {hotendProfiles.map(profile => (
                <div key={profile.id} className="flex items-center gap-2 bg-orange-50 p-2 rounded border border-orange-200">
                  <input
                    type="text"
                    value={profile.name}
                    onChange={e => handleUpdateProfile(profile.id, 'name', e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                    placeholder={t('temperatureProfiles.profileName', 'Nom du profil')}
                  />
                  <input
                    type="number"
                    value={profile.value}
                    onChange={e => handleUpdateProfile(profile.id, 'value', Number(e.target.value))}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                    min="0"
                    max="300"
                  />
                  <span className="text-sm text-gray-600">°C</span>
                  <button
                    onClick={() => handleDeleteProfile(profile.id)}
                    className="text-red-600 hover:text-red-700 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bed Profiles */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">
              {t('control.bed', 'Plateau')}
            </h3>
            <div className="space-y-2">
              {bedProfiles.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-2">
                  {t('temperatureProfiles.noProfiles', 'Aucun profil défini')}
                </p>
              )}
              {bedProfiles.map(profile => (
                <div key={profile.id} className="flex items-center gap-2 bg-blue-50 p-2 rounded border border-blue-200">
                  <input
                    type="text"
                    value={profile.name}
                    onChange={e => handleUpdateProfile(profile.id, 'name', e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('temperatureProfiles.profileName', 'Nom du profil')}
                  />
                  <input
                    type="number"
                    value={profile.value}
                    onChange={e => handleUpdateProfile(profile.id, 'value', Number(e.target.value))}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="120"
                  />
                  <span className="text-sm text-gray-600">°C</span>
                  <button
                    onClick={() => handleDeleteProfile(profile.id)}
                    className="text-red-600 hover:text-red-700 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add new profile */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              {t('temperatureProfiles.addNew', 'Ajouter un profil')}
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={newProfileType}
                onChange={e => {
                  setNewProfileType(e.target.value as 'hotend' | 'bed');
                  setNewProfileValue(e.target.value === 'hotend' ? 200 : 60);
                }}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="hotend">{t('control.hotend', 'Hotend')}</option>
                <option value="bed">{t('control.bed', 'Plateau')}</option>
              </select>
              <input
                type="text"
                value={newProfileName}
                onChange={e => setNewProfileName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddProfile()}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('temperatureProfiles.profileName', 'Nom du profil')}
              />
              <input
                type="number"
                value={newProfileValue}
                onChange={e => setNewProfileValue(Number(e.target.value))}
                onKeyPress={e => e.key === 'Enter' && handleAddProfile()}
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max={newProfileType === 'hotend' ? 300 : 120}
              />
              <span className="text-sm text-gray-600">°C</span>
              <button
                onClick={handleAddProfile}
                disabled={!newProfileName.trim()}
                className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            {t('common.cancel', 'Annuler')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {t('common.save', 'Enregistrer')}
          </button>
        </div>
      </div>
    </div>
  );
};
