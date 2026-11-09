import { useQuery } from "@tanstack/react-query";
import { agendasService } from "../services/agendas.service";
import { bandasService } from "../services/bandas.service";
import { ensaiosService } from "../services/ensaios.service";
import { equipamentosService } from "../services/equipamentos.service";
import { eventosService } from "../services/eventos.service";
import { feedbacksService } from "../services/feedbacks.service";
import { musicosService } from "../services/musicos.service";
import { repertoriosService } from "../services/repertorios.service";

export const queryKeys = {
  bandas: ["bandas"] as const,
  musicos: ["musicos"] as const,
  repertorios: ["repertorios"] as const,
  eventos: ["eventos"] as const,
  ensaios: ["ensaios"] as const,
  equipamentos: ["equipamentos"] as const,
  agendas: ["agendas"] as const,
  feedbacks: ["feedbacks"] as const
};

const commonOptions = {
  staleTime: 30_000,
  retry: 1,
  refetchOnWindowFocus: false
};

export function useBandas() {
  return useQuery({
    queryKey: queryKeys.bandas,
    queryFn: bandasService.listar,
    ...commonOptions
  });
}

export function useMusicos() {
  return useQuery({
    queryKey: queryKeys.musicos,
    queryFn: musicosService.listar,
    ...commonOptions
  });
}

export function useRepertorios() {
  return useQuery({
    queryKey: queryKeys.repertorios,
    queryFn: repertoriosService.listar,
    ...commonOptions
  });
}

export function useEventos() {
  return useQuery({
    queryKey: queryKeys.eventos,
    queryFn: eventosService.listar,
    ...commonOptions
  });
}

export function useEnsaios() {
  return useQuery({
    queryKey: queryKeys.ensaios,
    queryFn: ensaiosService.listar,
    ...commonOptions
  });
}

export function useEquipamentos() {
  return useQuery({
    queryKey: queryKeys.equipamentos,
    queryFn: equipamentosService.listar,
    ...commonOptions
  });
}

export function useAgendas() {
  return useQuery({
    queryKey: queryKeys.agendas,
    queryFn: agendasService.listar,
    ...commonOptions
  });
}

export function useFeedbacks() {
  return useQuery({
    queryKey: queryKeys.feedbacks,
    queryFn: feedbacksService.listar,
    ...commonOptions
  });
}

export function useMusicoMap() {
  const query = useMusicos();
  const map = new Map((query.data ?? []).map((musico) => [musico.idMusico, musico]));
  return { ...query, map };
}

export function useBandaMap() {
  const query = useBandas();
  const map = new Map((query.data ?? []).map((banda) => [banda.idBanda, banda]));
  return { ...query, map };
}
