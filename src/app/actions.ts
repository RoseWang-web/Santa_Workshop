'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { addDoc, collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, setDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type ChildDocument, ChildFormSchema } from '@/lib/types';
import { suggestAppropriateGifts, type SuggestAppropriateGiftsInput } from '@/ai/flows/suggest-appropriate-gifts';

export type FormState = {
  message: string;
  errors?: Record<string, string[] | undefined>;
  success: boolean;
};

// Generic function to handle child data submission (Create and Update)
async function saveChild(childId: string | null, prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = ChildFormSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check the fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { deliveryTime, ...restOfData } = validatedFields.data;

  const childDoc: Omit<ChildDocument, 'lastUpdated'> = {
    ...restOfData,
    deliveryTime: Timestamp.fromDate(deliveryTime),
  };

  try {
    if (childId) {
      // Update
      await setDoc(doc(db, 'children', childId), { ...childDoc, lastUpdated: serverTimestamp() }, { merge: true });
    } else {
      // Create
      await addDoc(collection(db, 'children'), { ...childDoc, lastUpdated: serverTimestamp() });
    }
    revalidatePath('/');
    return { message: `Successfully ${childId ? 'updated' : 'added'} child.`, success: true };
  } catch (e) {
    return { message: `Database error: Failed to ${childId ? 'update' : 'add'} child.`, success: false };
  }
}

export const addChild = saveChild.bind(null, null);
export const updateChild = saveChild.bind(null);

export async function deleteChild(childId: string): Promise<{ success: boolean; message: string }> {
  try {
    await deleteDoc(doc(db, 'children', childId));
    revalidatePath('/');
    return { success: true, message: 'Child deleted.' };
  } catch (e) {
    return { success: false, message: 'Database error: Failed to delete child.' };
  }
}

export async function restoreChild(child: ChildDocument): Promise<{ success: boolean; message: string }> {
  try {
    await addDoc(collection(db, 'children'), { ...child, lastUpdated: serverTimestamp() });
    revalidatePath('/');
    return { success: true, message: 'Child restored.' };
  } catch (e) {
    return { success: false, message: 'Database error: Failed to restore child.' };
  }
}

export async function getGiftSuggestions(input: SuggestAppropriateGiftsInput) {
  try {
    const result = await suggestAppropriateGifts(input);
    return { success: true, suggestions: result.suggestions };
  } catch (e) {
    return { success: false, message: 'AI error: Could not get suggestions.' };
  }
}

export async function seedData() {
  const seedCheck = await getDocs(query(collection(db, 'children'), limit(1)));
  if (seedCheck.size > 0) {
    return { success: false, message: "Database is not empty. Seeding aborted." };
  }

  const seedChildren = [
    { name: 'Leo Claus', address: '123 North Pole Lane, Arctic Circle', gift: 'Toy Train Set', behaviorCategory: 'Nice', ageRange: '5-7', deliveryTime: new Date('2024-12-25T02:00:00Z') },
    { name: 'Mia Frost', address: '456 Candy Cane Ct, Wonderland', gift: 'Watercolor Art Set', behaviorCategory: 'Almost Nice', ageRange: '8-10', deliveryTime: new Date('2024-12-25T03:30:00Z') },
    { name: 'Noah Kringle', address: '789 Reindeer Road, Winterland', gift: 'Space Adventure Video Game', behaviorCategory: 'Naughty', ageRange: '11+', deliveryTime: new Date('2024-12-25T05:00:00Z') },
  ] as const;

  const batch = writeBatch(db);
  seedChildren.forEach((child) => {
    const docRef = doc(collection(db, 'children'));
    const childDoc: Omit<ChildDocument, 'lastUpdated'> & { lastUpdated: Timestamp } = {
      ...child,
      deliveryTime: Timestamp.fromDate(child.deliveryTime),
      lastUpdated: serverTimestamp() as Timestamp,
    };
    batch.set(docRef, childDoc);
  });

  try {
    await batch.commit();
    revalidatePath('/');
    return { success: true, message: 'Sample data seeded successfully.' };
  } catch (e) {
    return { success: false, message: 'Database error: Failed to seed data.' };
  }
}