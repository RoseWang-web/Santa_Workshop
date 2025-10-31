import type { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

export const BEHAVIOR_CATEGORIES = ['Nice', 'Almost Nice', 'Naughty'] as const;
export type BehaviorCategory = (typeof BEHAVIOR_CATEGORIES)[number];

export const AGE_RANGES = ['2-4', '5-7', '8-10', '11+'] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

// Schema for form validation
export const ChildFormSchema = z.object({
  name: z.string({ required_error: 'Name is required.' }).min(2, { message: 'Name must be at least 2 characters.' }),
  address: z.string({ required_error: 'Address is required.' }).min(5, { message: 'Address must be at least 5 characters.' }),
  gift: z.string({ required_error: 'Gift is required.' }).min(2, { message: 'Gift must be at least 2 characters.' }),
  behaviorCategory: z.enum(BEHAVIOR_CATEGORIES, { required_error: 'Please select a behavior category.' }),
  ageRange: z.enum(AGE_RANGES, { required_error: 'Please select an age range.' }),
  deliveryTime: z.coerce.date({ required_error: 'Please select a valid delivery date.' }).refine(date => date > new Date(), { message: 'Delivery time must be in the future.' }),
});

export interface Child {
  id: string;
  name: string;
  address: string;
  gift: string;
  behaviorCategory: BehaviorCategory;
  ageRange: AgeRange;
  deliveryTime: Date;
}

export interface ChildDocument {
  name: string;
  address: string;
  gift: string;
  behaviorCategory: BehaviorCategory;
  ageRange: AgeRange;
  deliveryTime: Timestamp;
  lastUpdated: Timestamp;
}