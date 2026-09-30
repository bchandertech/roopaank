import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./Home";

describe("Home", () => {
  test("renders the hero heading and eyebrow text", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Fashion Jewellery for Every You",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Trendy.*Affordable.*Everyday Style/),
    ).toBeInTheDocument();
  });

  test("renders the hero call-to-action buttons", () => {
    render(<Home />);

    expect(
      screen.getByRole("button", { name: "Shop Now" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Explore Collection" }),
    ).toBeInTheDocument();
  });

  test("renders every palette swatch", () => {
    render(<Home />);

    const names = [
      "primary",
      "primary-hover",
      "primary-deep",
      "blush",
      "blush-deep",
      "page",
      "surface",
      "line",
      "ink",
      "muted",
      "eyebrow",
      "success",
    ];
    for (const name of names) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  test("renders the sample product card with en-IN prices and discount", () => {
    render(<Home />);

    const card = screen
      .getByRole("heading", { level: 3, name: "Multicolor Jhumka Earrings" })
      .closest("div");

    expect(within(card).getByText("₹199")).toBeInTheDocument();
    expect(within(card).getByText("₹499")).toBeInTheDocument();
    expect(within(card).getByText("60% OFF")).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: "Add to Cart" }),
    ).toBeInTheDocument();
  });

  test("hero buttons are reachable with the keyboard in order", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.tab();
    expect(screen.getByRole("button", { name: "Shop Now" })).toHaveFocus();

    await user.tab();
    expect(
      screen.getByRole("button", { name: "Explore Collection" }),
    ).toHaveFocus();
  });
});
