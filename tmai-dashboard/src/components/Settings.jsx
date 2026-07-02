import { useState } from 'react';

const initialSections = [
  {
    id: 'ai',
    label: 'AI ENGINE',
    items: [
      { id: 'risk',     label: 'Enable AI Risk Prediction',   desc: 'Automatically assess task risk levels',        value: true  },
      { id: 'suggest',  label: 'AI Team Suggestions',         desc: 'Suggest optimal team members for tasks',       value: true  },
      { id: 'conflict', label: 'Deadline Conflict Detection',  desc: 'Alert when tasks have overlapping deadlines',  value: true  },
    ],
  },
  {
    id: 'notif',
    label: 'NOTIFICATIONS',
    items: [
      { id: 'critical', label: 'Critical Risk Alerts', desc: 'Notify for high-risk tasks immediately',     value: true  },
      { id: 'weekly',   label: 'Weekly Reports',       desc: 'Send AI-generated weekly summaries',         value: false },
      { id: 'team',     label: 'Team Updates',         desc: 'Notify on task assignments and completions', value: true  },
    ],
  },
  {
    id: 'display',
    label: 'DISPLAY',
    items: [
      { id: 'darkmode',  label: 'Dark Mode',    desc: 'Switch to dark theme',               value: false },
      { id: 'compact',   label: 'Compact View', desc: 'Show more tasks in less space',       value: false },
      { id: 'animation', label: 'Animations',   desc: 'Enable UI transition animations',     value: true  },
    ],
  },
];

function Toggle({ value, onChange }) {
  return (
    <div className={`toggle ${value ? 'toggle-on' : ''}`} onClick={onChange}>
      <div className="toggle-thumb" />
    </div>
  );
}

export default function Settings() {
  const [sections, setSections] = useState(initialSections);

  const toggleItem = (sectionId, itemId) => {
    setSections(prev => prev.map(sec =>
      sec.id !== sectionId ? sec : {
        ...sec,
        items: sec.items.map(item => item.id !== itemId ? item : { ...item, value: !item.value })
      }
    ));
  };

  return (
    <div className="settings-page">
      <h1 className="settings-heading">Settings</h1>
      <div className="settings-sections">
        {sections.map((sec) => (
          <div key={sec.id} className="settings-card">
            <div className="settings-section-label">{sec.label}</div>
            {sec.items.map((item, i) => (
              <div key={item.id} className={`settings-row ${i < sec.items.length - 1 ? 'settings-row-border' : ''}`}>
                <div className="settings-row-info">
                  <div className="settings-row-label">{item.label}</div>
                  <div className="settings-row-desc">{item.desc}</div>
                </div>
                <Toggle value={item.value} onChange={() => toggleItem(sec.id, item.id)} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
