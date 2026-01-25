from playwright.sync_api import Page, expect, sync_playwright

def verify_cohort_creation_ui(page: Page):
    print("Navigating to page...")
    # 1. Arrange: Go to the verify page
    page.goto("http://localhost:3001/verify-team-table")

    print("Clicking Create Cohort...")
    # 2. Act: Click "Create Cohort"
    create_btn = page.get_by_role("button", name="Create Cohort")
    expect(create_btn).to_be_visible()
    create_btn.click()

    print("Verifying Modal...")
    # 3. Assert: Verify Modal opens
    # Look for "Name" label and input
    name_label = page.get_by_label("Name")
    expect(name_label).to_be_visible()

    # Fill in some data to show it works
    name_label.fill("New Test Cohort")
    page.get_by_label("Description").fill("This is a test.")

    # 4. Screenshot
    print("Taking screenshot of Create Mode...")
    page.screenshot(path="verification/create_cohort_modal.png")

    # Close modal
    page.get_by_role("button", name="Cancel").click()

    print("Opening existing cohort...")
    # Assuming "Existing Cohort" is rendered as a button from the mock data
    page.get_by_role("button", name="Existing Cohort").click()

    print("Clicking Edit...")
    page.get_by_role("button", name="Edit").click()

    print("Verifying Delete button...")
    delete_btn = page.get_by_role("button", name="Delete")
    expect(delete_btn).to_be_visible()

    # Screenshot of edit mode
    print("Taking screenshot of Edit Mode...")
    page.screenshot(path="verification/edit_cohort_modal.png")


if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_cohort_creation_ui(page)
            print("Verification script finished successfully.")
        except Exception as e:
            print(f"Verification script failed: {e}")
        finally:
            browser.close()
