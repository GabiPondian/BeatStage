import prisma from "../lib/prisma";
import { AppError } from "../errors/AppError";

//BANDA ATIVA EM QUE O MÚSICO PARTICIPA (COMO LÍDER OU COMO MEMBRO)
export async function buscarBandaDoMusico(idBanda: number, idMusico: number) {
  const banda = await prisma.banda.findFirst({
    where: { idBanda, ativo: true },
    select: { idBanda: true, idLider: true }
  });

  if (!banda) {
    throw new AppError("Banda não encontrada", 404);
  }

  if (banda.idLider === idMusico) {
    return banda;
  }

  const membro = await prisma.membroBanda.findUnique({
    where: { idBanda_idMusico: { idBanda, idMusico } },
    select: { idBanda: true }
  });

  if (!membro) {
    throw new AppError("Você não participa desta banda", 403);
  }

  return banda;
}

//EXIGE QUE O MÚSICO SEJA O LÍDER DA BANDA (AUTORIZAÇÃO POR ASSOCIAÇÃO)
export async function exigirLiderDaBanda(idBanda: number, idMusico: number) {
  const banda = await buscarBandaDoMusico(idBanda, idMusico);

  if (banda.idLider !== idMusico) {
    console.warn(
      `[autorizacao] banda ${idBanda}: lider=${banda.idLider} autenticado=${idMusico}`
    );
    throw new AppError(
      "Apenas o líder da banda pode realizar esta operação",
      403
    );
  }

  return banda;
}

//IDS DAS BANDAS ATIVAS EM QUE O MÚSICO PARTICIPA
export async function idsBandasDoMusico(idMusico: number): Promise<number[]> {
  const bandas = await prisma.banda.findMany({
    where: {
      ativo: true,
      OR: [{ idLider: idMusico }, { membros: { some: { idMusico } } }]
    },
    select: { idBanda: true }
  });

  return bandas.map((banda) => banda.idBanda);
}
