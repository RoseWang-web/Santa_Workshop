# **App Name**: Santa's Workshop Tracker

## Core Features:

- Add Child: Add a new child to the Firestore database with their name, address, desired gift, behavior category, and delivery time.
- List Children: Display a list of all children in the Firestore database, including all details, updating the display as gifts are assigned or delivery times are scheduled.
- Update Gift: Update the gift assigned to a child. An AI tool reviews the gift type and recommends associated toys and accessories appropriate to the behavior category and age range.
- Delete Child: Delete a child's record from the Firestore database. Implement an 'undo' option with a limited time window.
- Real-Time Listener: Implement a real-time listener that updates the UI when data changes in the Firestore database.  Newly added, modified, or deleted records are immediately reflected.

## Style Guidelines:

- Primary color: Deep red (#A50021) for the festive holiday theme.
- Background color: Light beige (#F5F5DC), very slightly tinted with the primary red (hue 0, saturation 10%) to create a warm, inviting backdrop that doesn’t distract from the content.
- Accent color: Forest green (#228B22), is used to highlight key actions and interactive elements, offering a festive but contrasting element to the design.
- Body font: 'PT Sans', sans-serif, suitable for both headlines and body text.
- Use holiday-themed icons (e.g., gifts, reindeer, elves) to enhance the visual appeal and user experience.
- Use a clear, intuitive layout with well-defined sections for each CRUD operation. Prioritize ease of use and quick access to data.
- Subtle animations when data is updated or added, such as a gentle fade-in or slide-in effect.