<template>
  <div class="path-field">
    <div class="field-info">
      <p v-if="isGenerating" class="status">Generating path...</p>
      <p v-else-if="error" class="status error">{{ error }}</p>
      <p v-else class="status success">
        {{ currentPath || "No path generated" }}
      </p>
    </div>

    <template v-if="sdk.user.spaceMembership.admin">
      <div class="debug-info" v-if="debugMode">
        <h4>Debug Information</h4>
        <div><strong>Current Slug:</strong> {{ currentSlug || "Not set" }}</div>
        <div><strong>Parent ID:</strong> {{ parentId || "No parent" }}</div>
        <div><strong>Generated Path:</strong> {{ currentPath || "None" }}</div>
      </div>

      <button
        type="button"
        @click="debugMode = !debugMode"
        class="debug-toggle"
      >
        {{ debugMode ? "Hide" : "Show" }} Debug Info
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from "vue";
import type { FieldAppSDK } from "@contentful/app-sdk";

const props = defineProps<{ sdk: FieldAppSDK }>();

// Reactive state
const currentPath = ref<string>("");
const currentSlug = ref<string>("");
const parentId = ref<string>("");
const isGenerating = ref(false);
const error = ref<string>("");
const debugMode = ref(false);

const LOCALE = "nl-NL";

/**
 * Recursively builds the path by fetching parent entries
 */
async function buildPathRecursively(
  entryId: string,
  visitedIds = new Set<string>(),
  currentEntryData?: { slug: string; parentId?: string }
): Promise<string[]> {
  // Prevent infinite loops
  if (visitedIds.has(entryId)) {
    throw new Error("Circular reference detected in parent hierarchy");
  }

  visitedIds.add(entryId);

  try {
    let slug: string;
    let parentRef: { sys: { id: string } } | null;

    // If this is the current entry and we have fresh data, use it
    if (currentEntryData && entryId === props.sdk.entry.getSys().id) {
      slug = currentEntryData.slug;
      parentRef = currentEntryData.parentId
        ? { sys: { id: currentEntryData.parentId } }
        : null;
      console.log("Using current entry data:", { slug, parentRef });
    } else {
      // Fetch parent entries normally
      const entry = await props.sdk.space.getEntry(entryId);
      slug = entry.fields.slug?.[LOCALE];
      parentRef = entry.fields.parent?.[LOCALE];
      console.log("Fetched entry data:", { entryId, slug, parentRef });
    }

    if (!slug) {
      return [];
    }

    if (parentRef?.sys?.id) {
      // Recursively get parent path and prepend it
      const parentPath = await buildPathRecursively(
        parentRef.sys.id,
        new Set(visitedIds)
      );
      return [...parentPath, slug];
    }

    // This is the root page
    return [slug];
  } catch (err) {
    console.error("Error fetching entry:", err);
    throw new Error(
      `Failed to fetch entry ${entryId}: ${
        err instanceof Error ? err.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generates the full path and updates the field
 */
async function generateAndUpdatePath() {
  console.log(
    "generateAndUpdatePath called with slug:",
    currentSlug.value,
    "parentId:",
    parentId.value
  );

  // Use the reactive currentSlug value instead of re-reading from entry
  if (!currentSlug.value) {
    // Clear the path if no slug
    await props.sdk.field.setValue("");
    currentPath.value = "";
    console.log("Cleared path due to empty slug");
    return;
  }

  isGenerating.value = true;
  error.value = "";

  try {
    const currentEntry = props.sdk.entry;
    const pathSegments = await buildPathRecursively(
      currentEntry.getSys().id,
      new Set(),
      {
        slug: currentSlug.value,
        parentId: parentId.value,
      }
    );
    const fullPath = pathSegments.join("/");

    console.log("Generated path:", fullPath);

    // Update the field value
    await props.sdk.field.setValue(fullPath);
    currentPath.value = fullPath;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    error.value = errorMessage;
    console.error("Error generating path:", err);
  } finally {
    isGenerating.value = false;
  }
}

/**
 * Updates reactive state from entry fields
 */
function updateStateFromEntry() {
  const entry = props.sdk.entry;

  // Get current slug
  const slugField = entry.fields.slug?.getValue();
  currentSlug.value = slugField || "";

  // Get parent reference
  const parentField = entry.fields.parent?.getValue();
  parentId.value = parentField?.sys?.id || "";
}

// Store unsubscribe functions for cleanup
let unsubscribeSlug: (() => void) | null = null;
let unsubscribeParent: (() => void) | null = null;

// Subscribe to field changes
function setupFieldSubscriptions() {
  const entry = props.sdk.entry;

  // Clean up existing subscriptions
  if (unsubscribeSlug) unsubscribeSlug();
  if (unsubscribeParent) unsubscribeParent();

  // Subscribe to slug field changes
  const slugField = entry.fields.slug;
  if (slugField) {
    unsubscribeSlug = slugField.onValueChanged(async (value) => {
      console.log("Slug changed to:", value);
      // Use the new value directly instead of re-reading from entry
      currentSlug.value = value || "";

      // Don't call updateStateFromEntry() as it might overwrite with stale data
      await generateAndUpdatePath();
    });
  }

  // Subscribe to parent field changes
  const parentField = entry.fields.parent;
  if (parentField) {
    unsubscribeParent = parentField.onValueChanged(async (value) => {
      console.log("Parent changed to:", value);
      // Use the new value directly instead of re-reading from entry
      parentId.value = value?.sys?.id || "";

      // Don't call updateStateFromEntry() as it might overwrite with stale data
      await generateAndUpdatePath();
    });
  }
}

// Initialize on mount
onMounted(async () => {
  try {
    // Make the field automatically resize
    props.sdk.window.updateHeight();

    // Initialize state
    updateStateFromEntry();

    // Setup field subscriptions
    setupFieldSubscriptions();

    // Generate initial path
    await generateAndUpdatePath();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to initialize";
    console.error("Initialization error:", err);
  }
});

// Watch the debugMode var
watch(debugMode, async () => {
  await nextTick();
  props.sdk.window.updateHeight();
});
</script>

<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    sans-serif;
  margin: 0;
  padding: 0;
}
</style>

<style scoped>
.status {
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  user-select: none;
}

.status.success {
  background-color: #f0f8f0;
  color: #2d5016;
  border: 1px solid #a7d129;
}

.status.error {
  background-color: #fef7f7;
  color: #d93025;
  border: 1px solid #f28b82;
}

.debug-info {
  margin-top: 16px;
  padding: 12px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  font-size: 13px;
}

.debug-info h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #495057;
}

.debug-info > div {
  margin: 4px 0;
}

.debug-toggle {
  margin-top: 12px;
  padding: 6px 12px;
  background-color: #ffffff;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #4a5568;
}

.debug-toggle:hover {
  background-color: #f7fafc;
}

p {
  margin: 0;
}
</style>
