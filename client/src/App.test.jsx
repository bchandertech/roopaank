import { screen } from "@testing-library/react";
import App from "./App";
import { renderWithProviders } from "./test/renderWithProviders";

test("App renders the layout and the home page", () => {
  renderWithProviders(<App />);

  expect(
    screen.getByRole("heading", {
      level: 1,
      name: "Fashion Jewellery for Every You",
    }),
  ).toBeInTheDocument();
  expect(screen.getByRole("banner")).toBeInTheDocument();
  expect(screen.getByText("Free Shipping on Orders Above ₹499")).toBeInTheDocument();
});
