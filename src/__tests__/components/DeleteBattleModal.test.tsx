import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeleteContactButton from "@/components/contacts/DeleteContactButton";
import type { BattleContact } from "@/components/contacts/DeleteBattleModal";
import { deleteContactAction } from "@/app/contacts/actions";

jest.mock("@/app/contacts/actions", () => ({
  deleteContactAction: jest.fn(async () => ({})),
}));

const mockedDelete = deleteContactAction as jest.MockedFunction<
  typeof deleteContactAction
>;

const ada: BattleContact = {
  first_name: "Ada",
  last_name: "Lovelace",
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  photo: null,
  company: "Analytical Engines",
  job_title: "Mathematician",
};

beforeEach(() => {
  mockedDelete.mockClear();
  mockedDelete.mockResolvedValue({});
  window.localStorage.clear();
});

/** With contact data present, clicking delete summons the boss fight. */
function openBattle(): HTMLElement {
  render(
    <DeleteContactButton contactId={7} contactName="Ada Lovelace" contact={ada} />,
  );
  fireEvent.click(screen.getByRole("button", { name: /delete ada lovelace/i }));
  return screen.getByRole("dialog");
}

describe("DeleteBattleModal", () => {
  it("opens on delete with the boss at full HP and full energy", () => {
    const dialog = openBattle();

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(
      screen.getByRole("heading", { name: "Ada Lovelace" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/mathematician/i)).toBeInTheDocument();
    // Boss HP and player energy both start at 100/100.
    expect(screen.getAllByText("100/100")).toHaveLength(2);
    expect(screen.getByText(/a wild ADA LOVELACE appeared/i)).toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it("falls back to the classic confirm when no contact data is provided", async () => {
    render(<DeleteContactButton contactId={7} contactName="Ada Lovelace" />);

    await userEvent.click(
      screen.getByRole("button", { name: /delete ada lovelace/i }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Delete?")).toBeInTheDocument();
  });

  it("lets the user run away without deleting", async () => {
    openBattle();

    await userEvent.click(screen.getByRole("button", { name: /run/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /delete ada lovelace/i }),
    ).toBeInTheDocument();
  });

  it("aborts on Escape without deleting", () => {
    const dialog = openBattle();

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it("chips HP per attack, needs a Cold Brew, and deletes on the final blow", async () => {
    openBattle();
    const attack = screen.getByRole("button", { name: /attack/i });

    await userEvent.click(attack);
    expect(screen.getByText("75/100")).toBeInTheDocument();
    expect(screen.getByText(/took 25 damage/i)).toBeInTheDocument();

    await userEvent.click(attack);
    await userEvent.click(attack);
    expect(screen.getByText("25/100")).toBeInTheDocument();

    // Three swings cost 90 energy; the fourth is refused until a Cold Brew.
    await userEvent.click(attack);
    expect(screen.getByText(/too drained to attack/i)).toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /cold brew/i }));
    expect(screen.getByText(/energy fully restored/i)).toBeInTheDocument();

    await userEvent.click(attack);
    expect(screen.getByText(/out of office\. forever\./i)).toBeInTheDocument();
    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(7, false));
  });

  it("CRITICAL DELETE finishes the fight and deletes immediately", async () => {
    openBattle();

    await userEvent.click(
      screen.getByRole("button", { name: /critical delete/i }),
    );

    expect(screen.getByText("0/100")).toBeInTheDocument();
    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(7, false));
  });

  it("persists the mute preference", async () => {
    openBattle();
    const mute = screen.getByRole("button", { name: /mute battle sounds/i });

    expect(mute).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(mute);

    expect(mute).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem("contacts.battle-muted")).toBe("1");
  });
});
