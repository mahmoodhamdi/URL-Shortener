import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinkEditDialog } from '@/components/url/LinkEditDialog';
import type { Link } from '@/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Sample link for testing
const mockLink: Link = {
  id: 'link-123',
  originalUrl: 'https://example.com/original',
  shortCode: 'abc123',
  customAlias: 'my-alias',
  title: 'Test Link',
  description: 'A test description',
  password: null,
  expiresAt: null,
  isActive: true,
  isFavorite: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  userId: 'user-1',
  folderId: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmTerm: null,
  utmContent: null,
  tags: [{ id: 'tag-1', name: 'marketing' }],
  folder: undefined,
  _count: { clicks: 100 },
};

const mockLinkWithPassword: Link = {
  ...mockLink,
  id: 'link-456',
  password: 'hashed-password',
};

const mockLinkWithFolder: Link = {
  ...mockLink,
  id: 'link-789',
  folderId: 'folder-1',
  folder: {
    id: 'folder-1',
    name: 'Marketing',
    color: '#ff0000',
    userId: 'user-1',
    createdAt: new Date(),
  },
};

const mockFolders = [
  { id: 'folder-1', name: 'Marketing', color: '#ff0000', userId: 'user-1', createdAt: new Date() },
  { id: 'folder-2', name: 'Sales', color: '#00ff00', userId: 'user-1', createdAt: new Date() },
];

const mockTags = [
  { id: 'tag-1', name: 'marketing' },
  { id: 'tag-2', name: 'sales' },
];

describe('LinkEditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default fetch mock
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/folders') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFolders),
        });
      }
      if (url === '/api/tags') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTags),
        });
      }
      if (url.includes('/api/links/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockLink),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('should not render when closed', () => {
    render(
      <LinkEditDialog
        link={mockLink}
        open={false}
        onOpenChange={() => {}}
      />
    );

    expect(screen.queryByText('linkEdit.title')).not.toBeInTheDocument();
  });

  it('should render dialog when open', async () => {
    render(
      <LinkEditDialog
        link={mockLink}
        open={true}
        onOpenChange={() => {}}
      />
    );

    expect(screen.getByText('linkEdit.title')).toBeInTheDocument();
    expect(screen.getByText('linkEdit.description')).toBeInTheDocument();
  });

  it('should populate form with link data', async () => {
    render(
      <LinkEditDialog
        link={mockLink}
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      const urlInput = screen.getByRole('textbox', { name: /linkEdit.originalUrl/i }) as HTMLInputElement;
      expect(urlInput.value).toBe('https://example.com/original');
    });
  });

  it('should show password controls when link has password', async () => {
    render(
      <LinkEditDialog
        link={mockLinkWithPassword}
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('linkEdit.passwordSet')).toBeInTheDocument();
      expect(screen.getByText('linkEdit.changePassword')).toBeInTheDocument();
    });
  });

  it('should allow changing password when change button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <LinkEditDialog
        link={mockLinkWithPassword}
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('linkEdit.changePassword')).toBeInTheDocument();
    });

    await user.click(screen.getByText('linkEdit.changePassword'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('linkEdit.newPasswordPlaceholder')).toBeInTheDocument();
    });
  });

  it('should display tags from the link', async () => {
    render(
      <LinkEditDialog
        link={mockLink}
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('marketing')).toBeInTheDocument();
    });
  });

  it('should add a new tag when input is submitted', async () => {
    const user = userEvent.setup();

    render(
      <LinkEditDialog
        link={mockLink}
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('tags.addPlaceholder')).toBeInTheDocument();
    });

    const tagInput = screen.getByPlaceholderText('tags.addPlaceholder');
    await user.type(tagInput, 'newtag');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('newtag')).toBeInTheDocument();
    });
  });

  it('should remove a tag when X is clicked', async () => {
    const user = userEvent.setup();

    render(
      <LinkEditDialog
        link={mockLink}
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('marketing')).toBeInTheDocument();
    });

    // Find the X button for the marketing tag
    const tagElement = screen.getByText('marketing').closest('span');
    const removeButton = tagElement?.querySelector('button');

    if (removeButton) {
      await user.click(removeButton);
    }

    await waitFor(() => {
      expect(screen.queryByText('marketing')).not.toBeInTheDocument();
    });
  });

  it('should call onOpenChange when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <LinkEditDialog
        link={mockLink}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('common.cancel')).toBeInTheDocument();
    });

    await user.click(screen.getByText('common.cancel'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should submit the form and call API', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <LinkEditDialog
        link={mockLink}
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('common.save')).toBeInTheDocument();
    });

    await user.click(screen.getByText('common.save'));

    await waitFor(() => {
      // Should call the PATCH endpoint
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/links/${mockLink.id}`,
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  it('should display error when API call fails', async () => {
    const user = userEvent.setup();

    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/folders') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFolders),
        });
      }
      if (url === '/api/tags') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTags),
        });
      }
      if (url.includes('/api/links/') && url.endsWith(mockLink.id)) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Alias already taken' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    render(
      <LinkEditDialog
        link={mockLink}
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('common.save')).toBeInTheDocument();
    });

    await user.click(screen.getByText('common.save'));

    await waitFor(() => {
      expect(screen.getByText('Alias already taken')).toBeInTheDocument();
    });
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();

    render(
      <LinkEditDialog
        link={{ ...mockLink, password: null }}
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      const passwordInput = screen.getByPlaceholderText('linkEdit.passwordPlaceholder');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    // Find the visibility toggle button (it's the button inside the password field)
    const toggleButtons = screen.getAllByRole('button');
    const visibilityToggle = toggleButtons.find(btn =>
      btn.className.includes('absolute')
    );

    if (visibilityToggle) {
      await user.click(visibilityToggle);

      await waitFor(() => {
        const passwordInput = screen.getByPlaceholderText('linkEdit.passwordPlaceholder');
        expect(passwordInput).toHaveAttribute('type', 'text');
      });
    }
  });

  it('should clear expiration when clear button is clicked', async () => {
    const user = userEvent.setup();
    const expiringLink = {
      ...mockLink,
      expiresAt: new Date('2025-12-31'),
    };

    render(
      <LinkEditDialog
        link={expiringLink}
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('linkEdit.clearExpiration')).toBeInTheDocument();
    });

    await user.click(screen.getByText('linkEdit.clearExpiration'));

    await waitFor(() => {
      expect(screen.queryByText('linkEdit.clearExpiration')).not.toBeInTheDocument();
    });
  });

  it('should update originalUrl in form', async () => {
    const user = userEvent.setup();

    render(
      <LinkEditDialog
        link={mockLink}
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://example.com/original')).toBeInTheDocument();
    });

    const urlInput = screen.getByDisplayValue('https://example.com/original');
    await user.clear(urlInput);
    await user.type(urlInput, 'https://new-url.com');

    expect(urlInput).toHaveValue('https://new-url.com');
  });

  it('should update custom alias in form', async () => {
    const user = userEvent.setup();

    render(
      <LinkEditDialog
        link={mockLink}
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('my-alias')).toBeInTheDocument();
    });

    const aliasInput = screen.getByDisplayValue('my-alias');
    await user.clear(aliasInput);
    await user.type(aliasInput, 'new-alias');

    expect(aliasInput).toHaveValue('new-alias');
  });
});
