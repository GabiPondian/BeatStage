-- AlterTable
-- RF25 (cálculo da duração do repertório): o modelo original não possuía
-- nenhum campo de duração. Campo opcional, sem impacto em registros existentes.
ALTER TABLE "Repertorio" ADD COLUMN     "duracaoSegundos" INTEGER;
