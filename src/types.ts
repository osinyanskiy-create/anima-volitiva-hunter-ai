/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  activePoints: number;
  photoColor: string;
}

export type PointType = 'grocery' | 'service_station' | 'tire_shop' | 'office';

export interface ClientPoint {
  id: string;
  name: string;
  address: string;
  type: PointType;
  contactPerson: string;
  averageMonthlySalesKg: number;
  overdueReceivables: number; // in UAH (грн)
  lastVisitDate: string;
}

export interface ReferenceScriptStep {
  id: string;
  key: string;
  title: string;
  description: string;
  weight: number; // percentage of weight in final score (e.g., 15)
  idealPhrases: string[];
}

export interface StepAnalysisResult {
  stepKey: string;
  stepTitle: string;
  status: 'completed' | 'partial' | 'missed' | 'failed';
  explanation: string;
  detectedPhrases: string[];
}

export interface DetectedUpsell {
  item: string; // 'Чай', 'Молотый кофе (кава мелена)', 'Какао', etc.
  offered: boolean;
  accepted: boolean;
  qtyDetails: string;
}

export interface AuditReport {
  id: string;
  agentId: string;
  agentName: string;
  pointId: string;
  pointName: string;
  pointAddress: string;
  date: string;
  transcript: string;
  complianceScore: number; // 0 - 100
  stepsAnalysis: StepAnalysisResult[];
  upsellAttempted: boolean;
  upsellSucceeded: boolean;
  detectedUpsells: DetectedUpsell[];
  technicalStateDiscussed: boolean;
  technicalStateClean: boolean; // cleared of grime/dirt
  receivablesDiscussed: boolean;
  receivablesRecoveredAmount: number; // if any UAH was collected
  critiqueText: string; // detailed Russian critique paragraph for supervisor
  supervisorActions: string[]; // concrete next steps for supervisor to brief agent
  isCaseStudy?: 'successful' | 'unsuccessful' | null;
  caseNotes?: string;
  huntingPhase?: string;
}

export interface SalesScript {
  id: string;
  name: string;
  active: boolean;
  steps: ReferenceScriptStep[];
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  isActive: boolean;
  createdAt: string;
}

