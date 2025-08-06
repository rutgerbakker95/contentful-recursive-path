import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import FieldLocation from "../FieldLocation.vue";

describe("FieldLocation", () => {
  let mockSDK: any;

  beforeEach(() => {
    // Create a basic mock SDK
    mockSDK = {
      entry: {
        getSys: () => ({ id: "test-entry-id" }),
        fields: {
          slug: {
            getValue: vi.fn(() => "test-slug"),
            onValueChanged: vi.fn(() => vi.fn()),
          },
          parent: {
            getValue: vi.fn(() => null),
            onValueChanged: vi.fn(() => vi.fn()),
          },
        },
      },
      field: {
        setValue: vi.fn(() => Promise.resolve()),
      },
      space: {
        getEntry: vi.fn(() =>
          Promise.resolve({
            fields: {
              slug: { "nl-NL": "test-slug" },
              parent: { "nl-NL": null },
            },
          })
        ),
      },
      window: {
        updateHeight: vi.fn(),
      },
    };
  });

  it("should render the component", () => {
    const wrapper = mount(FieldLocation, {
      props: { sdk: mockSDK },
    });

    expect(wrapper.find("h3").text()).toBe("Path Generator");
  });

  it("should initialize and call SDK methods", async () => {
    mount(FieldLocation, {
      props: { sdk: mockSDK },
    });

    await nextTick();

    expect(mockSDK.window.updateHeight).toHaveBeenCalled();
    expect(mockSDK.entry.fields.slug.getValue).toHaveBeenCalled();
    expect(mockSDK.entry.fields.parent.getValue).toHaveBeenCalled();
  });

  it("should toggle debug mode", async () => {
    const wrapper = mount(FieldLocation, {
      props: { sdk: mockSDK },
    });

    expect(wrapper.find(".debug-info").exists()).toBe(false);

    await wrapper.find(".debug-toggle").trigger("click");

    expect(wrapper.find(".debug-info").exists()).toBe(true);
  });
});
