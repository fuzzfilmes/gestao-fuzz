// Menu lateral, igual para o dono e para a equipe.
// "equipe" lista os papéis que já têm a área liberada. Para liberar uma nova área,
// além de incluir o papel aqui, os dados dela precisam sair pela função painel_equipe().
import { Home, Users, FileText, Film, NotebookText, LayoutGrid, Calendar, CalendarDays, MessageCircle, DollarSign, Target, TrendingUp, Wrench, Calculator, FileSignature, Camera, Settings } from "lucide-react";

const TODOS = ["editor", "social"];

export const MENU = [
  { id: "inicio", nome: "Início", Icone: Home, equipe: TODOS },
  { id: "clientes", nome: "Clientes", Icone: Users, equipe: TODOS },
  { id: "propostas-lista", nome: "Propostas", Icone: FileText },
  { id: "demandas", nome: "Demandas", Icone: Film, equipe: TODOS },
  { id: "cronograma", nome: "Cronograma", Icone: CalendarDays, equipe: TODOS },
  { id: "recados", nome: "Recados", Icone: MessageCircle, equipe: TODOS },
  { id: "reunioes", nome: "Reuniões", Icone: NotebookText },
  { id: "kanban", nome: "Kanban semanal", Icone: LayoutGrid },
  { id: "agenda", nome: "Agenda", Icone: Calendar },
  { id: "financeiro", nome: "Financeiro", Icone: DollarSign },
  { id: "metas", nome: "Metas", Icone: Target },
  { id: "relatorios", nome: "Relatórios", Icone: TrendingUp },
  { divisor: "ferramentas" },
  { id: "processos", nome: "Processos internos", Icone: Wrench },
  { id: "calculadora", nome: "Calculadora", Icone: Calculator },
  { id: "propostas", nome: "Gerador de Propostas", Icone: FileText },
  { id: "contratos", nome: "Gerador de Contratos", Icone: FileSignature },
  { id: "equipamentos", nome: "Equipamentos", Icone: Camera },
  { divisor: "ajustes" },
  { id: "config", nome: "Configurações", Icone: Settings },
];
