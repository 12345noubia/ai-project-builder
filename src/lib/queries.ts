import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { layout, type SimpleEdge, type SimpleNode } from "./flow";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useWorkflows() {
  return useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workflows").select("id,name,status,project_id,updated_at,nodes").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRuns() {
  return useQuery({
    queryKey: ["runs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workflow_runs").select("*, workflows(name)").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });
}

export async function createProject(name: string, icon = "folder", source_repo?: string) {
  const { data, error } = await supabase.from("projects").insert({ name, icon, source_repo: source_repo ?? null }).select().single();
  if (error) throw error;
  return data;
}

export async function createWorkflow(project_id: string, name: string, graph?: { nodes: SimpleNode[]; edges: SimpleEdge[] }) {
  const g = graph ? layout(graph.nodes, graph.edges) : layout([{ id: "n1", kind: "trigger", title: "When something happens" }], []);
  const { data, error } = await supabase
    .from("workflows")
    .insert({ project_id, name, nodes: g.nodes as unknown as Json, edges: g.edges as unknown as Json })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function useInvalidate() {
  const qc = useQueryClient();
  return () => { qc.invalidateQueries({ queryKey: ["projects"] }); qc.invalidateQueries({ queryKey: ["workflows"] }); qc.invalidateQueries({ queryKey: ["runs"] }); };
}

export function useDeleteProject() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("projects").delete().eq("id", id); if (error) throw error; },
    onSuccess: inv,
  });
}
