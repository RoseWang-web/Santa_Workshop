'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { format, addDays } from 'date-fns';
import { CalendarIcon, Frown, Gift, Loader2, Meh, PlusCircle, Smile, Sparkles, ToyBrick, Users, Mail } from 'lucide-react';
import { useEffect, useState, useTransition, useActionState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useFormStatus } from 'react-dom';
import { z } from 'zod';


import { addChild, deleteChild, getGiftSuggestions, restoreChild, seedData, updateChild } from '@/app/actions';
import { AGE_RANGES, BEHAVIOR_CATEGORIES, type AgeRange, type BehaviorCategory, type Child, type ChildDocument, ChildFormSchema } from '@/lib/types';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToastAction } from '../ui/toast';

type ChildFormData = z.infer<typeof ChildFormSchema>;

const BehaviorIcon = ({ category }: { category: BehaviorCategory }) => {
  switch (category) {
    case 'Nice': return <Smile className="h-5 w-5 text-green-600" />;
    case 'Almost Nice': return <Meh className="h-5 w-5 text-yellow-600" />;
    case 'Naughty': return <Frown className="h-5 w-5 text-red-600" />;
    default: return null;
  }
};

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? <>{children}</> : null;
}

export function ChildrenDashboard() {
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, startSeedingTransition] = useTransition();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ id: string; doc: ChildDocument } | null>(null);
  const { toast } = useToast();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const [isSuggestionModalOpen, setSuggestionModalOpen] = useState(false);
  const [suggestionData, setSuggestionData] = useState<{gift: string, suggestions: string[]}>({gift: '', suggestions: []});
  const [isSuggestionLoading, setSuggestionLoading] = useState(false);
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [recentChanges, setRecentChanges] = useState<Array<{ id: string; type: 'added'|'modified'|'removed'; name: string; desc: string; at: Date }>>([]);
  const prevDocs = useRef<Map<string, any>>(new Map());


  useEffect(() => {
    const q = query(collection(db, 'children'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const childrenData: Child[] = [];
      const nextMap = new Map<string, any>();
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        nextMap.set(doc.id, data);
        childrenData.push({
          id: doc.id,
          name: data.name,
          address: data.address,
          gift: data.gift,
          behaviorCategory: data.behaviorCategory,
          ageRange: data.ageRange,
          deliveryTime: (data.deliveryTime as Timestamp).toDate(),
        });
      });
      setChildren(childrenData);
      setIsLoading(false);

      // Real-time notifications, skip initial snapshot
      if (isInitialLoad) {
        setIsInitialLoad(false);
        prevDocs.current = nextMap;
        return;
      }

      const changes = querySnapshot.docChanges();
      if (changes.length > 0) {
        let adds = 0, mods = 0, dels = 0;
        const detailed: Array<{ id: string; type: 'added'|'modified'|'removed'; name: string; desc: string; at: Date }> = [];
        changes.forEach((c) => {
          const cur = nextMap.get(c.doc.id) as any | undefined;
          const prev = prevDocs.current.get(c.doc.id) as any | undefined;
          if (c.type === 'added') {
            adds++;
            detailed.push({ id: c.doc.id, type: 'added', name: cur?.name ?? '(unknown)', desc: 'added to the list', at: new Date() });
          } else if (c.type === 'removed') {
            dels++;
            detailed.push({ id: c.doc.id, type: 'removed', name: prev?.name ?? '(unknown)', desc: 'removed from the list', at: new Date() });
          } else if (c.type === 'modified') {
            mods++;
            // compute field diffs
            const changed: string[] = [];
            if (prev && cur) {
              if (prev.gift !== cur.gift) changed.push(`gift: ${prev.gift ?? '—'} → ${cur.gift ?? '—'}`);
              if (prev.address !== cur.address) changed.push('address');
              if (prev.behaviorCategory !== cur.behaviorCategory) changed.push('behavior');
              if (prev.ageRange !== cur.ageRange) changed.push('age');
              const prevTime = (prev.deliveryTime as Timestamp | undefined)?.toMillis?.() ?? null;
              const curTime = (cur.deliveryTime as Timestamp | undefined)?.toMillis?.() ?? null;
              if (prevTime !== curTime) changed.push('delivery time');
            }
            const desc = changed.length ? `updated: ${changed.join(', ')}` : 'updated';
            detailed.push({ id: c.doc.id, type: 'modified', name: (cur?.name ?? prev?.name) ?? '(unknown)', desc, at: new Date() });
          }
        });

        const parts: string[] = [];
        if (adds) parts.push(`${adds} new ${adds === 1 ? 'letter' : 'letters'}`);
        if (mods) parts.push(`${mods} update${mods === 1 ? '' : 's'}`);
        if (dels) parts.push(`${dels} deletion${dels === 1 ? '' : 's'}`);

        if (parts.length) {
          setUnreadCount((n) => n + changes.length);
          setRecentChanges((prev) => {
            const next = [...detailed, ...prev].slice(0, 20);
            return next;
          });
          toast({
            title: 'Workshop update',
            description: parts.join(', '),
          });
        }
      }
      // update previous map after processing
      prevDocs.current = nextMap;
    }, (error) => {
      console.error("Error fetching children: ", error);
      setIsLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error Fetching Data',
        description: 'Could not fetch children list from Firestore.',
      });
    });

    return () => unsubscribe();
  }, [toast, isInitialLoad]);

  const handleSeedData = async () => {
    startSeedingTransition(async () => {
      const result = await seedData();
      toast({
        title: result.success ? 'Success' : 'Info',
        description: result.message,
        variant: result.success ? 'default' : 'destructive'
      });
    });
  };

  const handleOpenEditDialog = (child: Child) => {
    setEditingChild(child);
    setEditDialogOpen(true);
  };
  
  const handleDeleteChild = async (child: Child) => {
    const tempDeleted = {
      id: child.id,
      doc: {
        ...child,
        deliveryTime: Timestamp.fromDate(child.deliveryTime),
        lastUpdated: Timestamp.now(),
      }
    };
    
    setLastDeleted(tempDeleted);
    const result = await deleteChild(child.id);

    if (result.success) {
      toast({
        title: 'Child Deleted',
        description: `${child.name}'s record has been removed.`,
        action: (
          <ToastAction altText="Undo" onClick={async () => {
             if (tempDeleted) {
                await restoreChild(tempDeleted.doc);
                toast({ title: 'Undo Successful', description: `${child.name}'s record has been restored.`});
                setLastDeleted(null);
             }
          }}>
            Undo
          </ToastAction>
        ),
      });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
      setLastDeleted(null);
    }
  };
  
  const handleShowGiftSuggestions = async (child: Child) => {
      setSuggestionLoading(true);
      setSuggestionModalOpen(true);
      const result = await getGiftSuggestions({ gift: child.gift, ageRange: child.ageRange, behaviorCategory: child.behaviorCategory });
      if (result.success && result.suggestions) {
          setSuggestionData({ gift: child.gift, suggestions: result.suggestions });
      } else {
          toast({ variant: 'destructive', title: 'AI Error', description: 'Could not fetch gift suggestions.'});
          setSuggestionModalOpen(false);
      }
      setSuggestionLoading(false);
  }

  const onFormSubmitSuccess = (isEdit: boolean, data: ChildFormData) => {
    if(isEdit && editingChild) {
        if(editingChild.gift !== data.gift) {
            handleShowGiftSuggestions({ ...editingChild, ...data });
        }
        setEditDialogOpen(false);
        setEditingChild(null);
    } else {
        setAddDialogOpen(false);
    }
  }

  return (
    <TooltipProvider>
      <Card className="pixel-panel">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
             <div className="flex flex-col gap-1">
                <CardTitle className="text-2xl font-bold tracking-tight font-pixel-title">Children's List</CardTitle>
                <CardDescription>Manage the list of children for Santa's delivery.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="relative" onClick={() => { setNotifOpen(true); setUnreadCount(0); }} aria-label="Notifications">
                      <Mail className={cn("h-4 w-4", unreadCount > 0 && "santa-wiggle text-red-600")} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-600" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{unreadCount > 0 ? `${unreadCount} new update${unreadCount === 1 ? '' : 's'}` : 'No new updates'}</p>
                  </TooltipContent>
                </Tooltip>
                {!isLoading && children.length === 0 && (
                     <Button variant="outline" onClick={handleSeedData} disabled={isSeeding}>
                        {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                        Seed Sample Data
                    </Button>
                )}
                <ClientOnly>
                  <ChildFormDialog 
                      key="add-dialog"
                      isOpen={isAddDialogOpen}
                      onOpenChange={setAddDialogOpen}
                      onFormSubmitSuccess={(data) => onFormSubmitSuccess(false, data)}
                  >
                      <Button>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Child
                      </Button>
                  </ChildFormDialog>
                </ClientOnly>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Address</TableHead>
                  <TableHead>Gift</TableHead>
                  <TableHead>Behavior</TableHead>
                  <TableHead className="hidden lg:table-cell">Age</TableHead>
                  <TableHead className="hidden sm:table-cell">Delivery Time</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {children.map((child) => (
                  <TableRow key={child.id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-medium">{child.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{child.address}</TableCell>
                    <TableCell>{child.gift}</TableCell>
                    <TableCell>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "flex items-center gap-1.5 cursor-default",
                                    child.behaviorCategory === 'Nice' &&
                                      "text-green-700 bg-green-50 border-green-300 dark:text-green-300 dark:bg-green-900/20 dark:border-green-700",
                                    child.behaviorCategory === 'Almost Nice' &&
                                      "text-amber-700 bg-amber-50 border-amber-300 dark:text-amber-300 dark:bg-amber-900/20 dark:border-amber-700",
                                    child.behaviorCategory === 'Naughty' &&
                                      "text-red-700 bg-red-50 border-red-300 dark:text-red-300 dark:bg-red-900/20 dark:border-red-700"
                                  )}
                                >
                                    <BehaviorIcon category={child.behaviorCategory} />
                                    <span className="hidden sm:inline">{child.behaviorCategory}</span>
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{child.behaviorCategory}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{child.ageRange}</TableCell>
                    <TableCell className="hidden sm:table-cell">{format(child.deliveryTime, "MMM d, h:mm a")}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <ToyBrick className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEditDialog(child)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleShowGiftSuggestions(child)}>Gift Ideas</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteChild(child)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={isNotifOpen} onOpenChange={setNotifOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-pixel-title flex items-center gap-2"><Mail className="h-4 w-4"/> Workshop Updates</DialogTitle>
            <DialogDescription>Latest changes to the Nice List</DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-auto space-y-3 pr-1">
            {recentChanges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent updates.</p>
            ) : (
              recentChanges.map((c, idx) => (
                <div key={`${c.id}-${idx}`} className={cn("rounded-md border p-2 text-sm", c.type === 'added' && 'bg-green-50/60 border-green-200', c.type === 'modified' && 'bg-amber-50/60 border-amber-200', c.type === 'removed' && 'bg-red-50/60 border-red-200')}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{format(c.at, 'MMM d, h:mm a')}</span>
                  </div>
                  <div className="mt-1 text-foreground/80">{c.desc}</div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setNotifOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {editingChild && (
         <ChildFormDialog 
            key={`edit-dialog-${editingChild.id}`}
            isOpen={isEditDialogOpen}
            onOpenChange={setEditDialogOpen}
            child={editingChild}
            onFormSubmitSuccess={(data) => onFormSubmitSuccess(true, data)}
         />
      )}
      <GiftSuggestionDialog isOpen={isSuggestionModalOpen} onOpenChange={setSuggestionModalOpen} data={suggestionData} isLoading={isSuggestionLoading} />

    </TooltipProvider>
  );
}

function ChildFormDialog({
    children, 
    isOpen, 
    onOpenChange,
    child,
    onFormSubmitSuccess,
} : {
    children?: React.ReactNode;
    isOpen: boolean; 
    onOpenChange: (isOpen: boolean) => void;
    child?: Child | null;
    onFormSubmitSuccess: (data: ChildFormData) => void;
}) {
    const isEditMode = !!child;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            {children && <DialogTrigger asChild>{children}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Child' : 'Add New Child'}</DialogTitle>
                    <DialogDescription>{isEditMode ? `Update details for ${child.name}.` : 'Add a new child to Santa\'s list.'}</DialogDescription>
                </DialogHeader>
                <ChildForm isEditMode={isEditMode} child={child} onFormSubmitSuccess={onFormSubmitSuccess} />
            </DialogContent>
        </Dialog>
    );
}

function ChildForm({ isEditMode, child, onFormSubmitSuccess }: { isEditMode: boolean, child?: Child | null, onFormSubmitSuccess: (data: ChildFormData) => void }) {
    const { toast } = useToast();
    const action = isEditMode && child ? updateChild.bind(null, child.id) : addChild;
    const [formState, formAction] = useActionState(action, { message: '', success: false, errors: undefined });

    const defaultValues = useMemo(() => {
        if (isEditMode && child) {
            return {
                name: child.name,
                address: child.address,
                gift: child.gift,
                behaviorCategory: child.behaviorCategory,
                ageRange: child.ageRange,
                deliveryTime: child.deliveryTime,
            };
        }
        return {
            behaviorCategory: 'Nice' as const,
            ageRange: '5-7' as const,
            deliveryTime: addDays(new Date(), 1),
        };
    }, [isEditMode, child]);

    const form = useForm<ChildFormData>({
      resolver: zodResolver(ChildFormSchema),
      defaultValues: defaultValues,
    });
    
    useEffect(() => {
        if(formState.success){
            toast({ title: isEditMode ? 'Update Successful' : 'Child Added', description: formState.message });
            onFormSubmitSuccess(form.getValues());
            form.reset();
        } else if (formState.message && !formState.success && formState.errors) {
             Object.entries(formState.errors).forEach(([field, errors]) => {
                if (errors) {
                    form.setError(field as keyof ChildFormData, { type: 'server', message: errors.join(', ') });
                }
            });
        } else if (formState.message && !formState.success) {
            toast({ variant: 'destructive', title: 'An Error Occurred', description: formState.message });
        }
    }, [formState, isEditMode, toast, form, onFormSubmitSuccess]);

    return (
        <Form {...form}>
            <form action={formAction} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., Leo Claus" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="e.g., 123 North Pole Lane" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="gift" render={({ field }) => (
                    <FormItem><FormLabel>Desired Gift</FormLabel><FormControl><Input placeholder="e.g., Toy Train Set" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="behaviorCategory" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Behavior</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select behavior" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {BEHAVIOR_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="ageRange" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Age Range</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select age" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {AGE_RANGES.map(age => <SelectItem key={age} value={age}>{age}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                <FormField control={form.control} name="deliveryTime" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Delivery Time</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        <input type="hidden" name={field.name} value={field.value?.toISOString()} />
                    </FormItem>
                )}/>
                <DialogFooter>
                    <SubmitButton isEditMode={isEditMode} />
                </DialogFooter>
            </form>
        </Form>
    )
}

function SubmitButton({ isEditMode }: { isEditMode: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? 'Save Changes' : 'Add Child'}
    </Button>
  );
}

function GiftSuggestionDialog({ isOpen, onOpenChange, data, isLoading }: { isOpen: boolean, onOpenChange: (isOpen: boolean) => void, data: { gift: string, suggestions: string[] }, isLoading: boolean }) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-accent" />
                        AI Gift Suggestions
                    </DialogTitle>
                    <DialogDescription>
                        Here are some AI-powered suggestions to go with the gift: <strong>{data.gift}</strong>.
                    </DialogDescription>
                </DialogHeader>
                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <ul className="mt-4 space-y-3 list-disc list-inside bg-accent/10 p-4 rounded-md">
                        {data.suggestions.map((suggestion, index) => (
                            <li key={index} className="text-foreground/90">{suggestion}</li>
))}
                    </ul>
                )}
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
