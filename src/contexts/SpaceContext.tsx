import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { DEFAULT_CATEGORIES } from '../data';

export interface Space {
  id: string;
  name: string;
  inviteCode: string;
}

export interface Member {
  email: string;
  role: string;
}

interface SpaceCtx {
  space: Space | null;
  members: Member[];
  loading: boolean;
  loadSpace: () => Promise<void>;
  createSpace: (name: string) => Promise<string | null>;
  joinSpace: (code: string) => Promise<string | null>;
  leaveSpace: () => Promise<void>;
}

const Ctx = createContext<SpaceCtx | null>(null);

export function SpaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSpace = useCallback(async () => {
    if (!user) { setSpace(null); return; }
    setLoading(true);
    const { data } = await supabase
      .from('space_members')
      .select('role, spaces(id, name, invite_code)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data?.spaces) {
      const s = data.spaces as unknown as { id: string; name: string; invite_code: string };
      setSpace({ id: s.id, name: s.name, inviteCode: s.invite_code });
      const { data: m } = await supabase
        .from('space_members').select('email, role').eq('space_id', s.id);
      setMembers(m ?? []);
    } else {
      setSpace(null);
    }
    setLoading(false);
  }, [user]);

  const createSpace = async (name: string): Promise<string | null> => {
    if (!user) return 'Не авторизован';
    const { data: sp, error } = await supabase.rpc('create_space', { space_name: name });
    if (error) return error.message;
    const spaceId = (sp as { id: string }).id;
    await supabase.from('categories').insert(
      DEFAULT_CATEGORIES.map(c => ({ id: `${c.id}_${spaceId.slice(0, 8)}`, space_id: spaceId, name: c.name, icon: c.icon, type: c.type, color: c.color }))
    );
    await loadSpace();
    return null;
  };

  const joinSpace = async (code: string): Promise<string | null> => {
    if (!user) return 'Не авторизован';
    const { error } = await supabase.rpc('join_space', { p_code: code });
    if (error) {
      if (error.code === '23505' || error.message.includes('Already a member')) return 'Вы уже состоите в этом пространстве';
      if (error.message.includes('Space not found')) return 'Пространство не найдено. Проверьте код.';
      return error.message;
    }
    await loadSpace();
    return null;
  };

  const leaveSpace = async () => {
    if (!user || !space) return;
    await supabase.from('space_members').delete().eq('space_id', space.id).eq('user_id', user.id);
    setSpace(null);
    setMembers([]);
  };

  return (
    <Ctx.Provider value={{ space, members, loading, loadSpace, createSpace, joinSpace, leaveSpace }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSpace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSpace must be inside SpaceProvider');
  return ctx;
}
