import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { colors } from '../theme';
import { useProjects } from '../contexts/ProjectContext';

/**
 * The API has no notion of a "current" project, so the user picks one and the
 * choice is shared through ProjectContext.
 */
export default function ProjectPicker() {
  const { projects, activeProject, setActiveProjectId } = useProjects();
  const [isOpen, setIsOpen] = useState(false);

  if (projects.length === 0) {
    return <Text style={s.trigger}>Chưa có dự án</Text>;
  }

  return (
    <>
      <TouchableOpacity style={s.triggerRow} onPress={() => setIsOpen(true)} activeOpacity={0.7}>
        <Text style={s.trigger} numberOfLines={1}>
          {activeProject?.name ?? 'Chọn dự án'}
        </Text>
        {projects.length > 1 && <ChevronDown size={12} color={colors.muted} />}
      </TouchableOpacity>

      <Modal transparent visible={isOpen} animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setIsOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Chọn dự án</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {projects.map(project => {
                const isActive = project.projectId === activeProject?.projectId;
                return (
                  <TouchableOpacity
                    key={project.projectId}
                    style={s.option}
                    onPress={() => {
                      setActiveProjectId(project.projectId);
                      setIsOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.optionName}>{project.name}</Text>
                      <Text style={s.optionMeta}>
                        {project.progress}% · {project.status ?? 'Active'}
                      </Text>
                    </View>
                    {isActive && <Check size={16} color={colors.blue} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  triggerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  trigger: {
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 32 },
  sheet: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 8,
  },
  sheetTitle: { fontSize: 13, fontWeight: '700', color: colors.foreground, padding: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
  },
  optionName: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  optionMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
