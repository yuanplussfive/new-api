/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { parseSidebarModulesAdmin } from '@/features/system-settings/maintenance/config'
import { useStatus } from '@/hooks/use-status'
import { api } from '@/lib/api'
import { handleServerError } from '@/lib/handle-server-error'
import { useAuthStore } from '@/stores/auth-store'

type SidebarModuleConfig = {
  enabled: boolean
  [key: string]: boolean
}

type SidebarModulesConfig = Record<string, SidebarModuleConfig>

type SectionDef = {
  key: string
  title: string
  description: string
  modules: { key: string; title: string; description: string }[]
}

export function SidebarModulesCard() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<SidebarModulesConfig>({})
  const [expanded, setExpanded] = useState<string[]>([])
  const contentId = useId()
  const currentUser = useAuthStore((s) => s.auth.user)
  const setUser = useAuthStore((s) => s.auth.setUser)

  const sectionDefs: SectionDef[] = [
    {
      key: 'chat',
      title: t('Chat Area'),
      description: t('Playground and chat functions'),
      modules: [
        {
          key: 'playground',
          title: t('Chat plaza'),
          description: t('AI model testing environment'),
        },
        {
          key: 'chat',
          title: t('Chat'),
          description: t('Chat session management'),
        },
      ],
    },
    {
      key: 'console',
      title: t('Console Area'),
      description: t('Data management and log viewing'),
      modules: [
        {
          key: 'detail',
          title: t('Dashboard'),
          description: t('System data statistics'),
        },
        {
          key: 'token',
          title: t('Token Management'),
          description: t('API token management'),
        },
        {
          key: 'log',
          title: t('Usage Logs'),
          description: t('API usage records'),
        },
        {
          key: 'audit',
          title: t('Audit Logs'),
          description: t('Login, security and access records'),
        },
        {
          key: 'midjourney',
          title: t('Drawing Logs'),
          description: t('Drawing task records'),
        },
        {
          key: 'task',
          title: t('Task Logs'),
          description: t('System task records'),
        },
      ],
    },
    {
      key: 'personal',
      title: t('Personal Center Area'),
      description: t('User personal functions'),
      modules: [
        {
          key: 'topup',
          title: t('Wallet Management'),
          description: t('Balance and top-up management'),
        },
        {
          key: 'personal',
          title: t('Personal Settings'),
          description: t('Personal info settings'),
        },
        {
          key: 'security',
          title: t('Security & Access'),
          description: t('Manage your security settings and account access'),
        },
      ],
    },
  ]

  const adminConfig = parseSidebarModulesAdmin(
    status?.SidebarModulesAdmin as string | null | undefined
  )
  const visibleSectionDefs = status
    ? sectionDefs.flatMap((section) => {
        const adminSection = adminConfig[section.key]
        if (!adminSection?.enabled) return []

        const modules = section.modules.filter(
          (module) => adminSection[module.key] === true
        )
        return modules.length ? [{ ...section, modules }] : []
      })
    : []

  const loadConfig = useCallback(async () => {
    try {
      const res = await api.get('/api/user/self')
      if (res.data.success && res.data.data?.sidebar_modules) {
        const raw = res.data.data.sidebar_modules
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        setConfig(parsed)
      } else {
        setConfig({})
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const toggleExpanded = (sectionKey: string) => {
    setExpanded((prev) =>
      prev.includes(sectionKey)
        ? prev.filter((key) => key !== sectionKey)
        : [...prev, sectionKey]
    )
  }

  const toggleSection = (sectionKey: string, val: boolean) => {
    setConfig((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], enabled: val },
    }))
  }

  const toggleModule = (
    sectionKey: string,
    moduleKey: string,
    val: boolean
  ) => {
    setConfig((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [moduleKey]: val },
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const serialized = JSON.stringify(config)
      const res = await api.put('/api/user/self', {
        sidebar_modules: serialized,
      })
      if (res.data.success) {
        // Sync to auth-store so useSidebarConfig re-runs and the sidebar
        // updates immediately without needing a page refresh.
        if (currentUser) {
          setUser({ ...currentUser, sidebar_modules: serialized })
        }
        toast.success(t('Saved successfully'))
      } else {
        handleServerError(res.data, t('Save failed'))
      }
    } catch (error) {
      handleServerError(error, t('Save failed, please retry'))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    const defaults: SidebarModulesConfig = {}
    for (const sec of visibleSectionDefs) {
      defaults[sec.key] = { enabled: true }
      for (const mod of sec.modules) defaults[sec.key][mod.key] = true
    }
    setConfig(defaults)
    toast.success(t('Reset to default configuration'))
  }

  if (!status) return null

  return (
    <section
      className='profile-aside-section'
      aria-labelledby='profile-sidebar-title'
    >
      <h2 id='profile-sidebar-title' className='profile-aside-title'>
        {t('Sidebar Personal Settings')}
      </h2>
      <p className='profile-aside-description'>
        {t('Customize sidebar display content')}
      </p>
      <div className='profile-sidebar-sections'>
        {visibleSectionDefs.map((section) => {
          const sectionEnabled = config[section.key]?.enabled !== false
          const sectionContentId = `${contentId}-${section.key}`
          const isExpanded = expanded.includes(section.key)
          return (
            <div key={section.key} className='profile-sidebar-section'>
              <div className='profile-sidebar-section-row'>
                <button
                  type='button'
                  aria-expanded={isExpanded}
                  aria-controls={sectionContentId}
                  className='profile-sidebar-expand'
                  onClick={() => toggleExpanded(section.key)}
                >
                  <ChevronRight aria-hidden='true' />
                  <span className='profile-sidebar-section-copy'>
                    <span className='profile-sidebar-section-name'>
                      {section.title}
                    </span>
                    <span className='profile-sidebar-section-description'>
                      {section.description}
                    </span>
                  </span>
                  <span className='profile-sidebar-count'>
                    {
                      section.modules.filter(
                        (mod) => config[section.key]?.[mod.key] !== false
                      ).length
                    }
                    /{section.modules.length}
                  </span>
                </button>
                <Switch
                  aria-label={section.title}
                  checked={sectionEnabled}
                  onCheckedChange={(value) => toggleSection(section.key, value)}
                />
              </div>
              {isExpanded && (
                <div
                  id={sectionContentId}
                  className='profile-sidebar-modules'
                  aria-label={section.title}
                >
                  {section.modules.map((mod) => (
                    <div
                      key={mod.key}
                      className='profile-sidebar-module'
                      data-disabled={!sectionEnabled}
                    >
                      <div>
                        <p className='profile-sidebar-module-name'>
                          {mod.title}
                        </p>
                        <p className='profile-sidebar-module-description'>
                          {mod.description}
                        </p>
                      </div>
                      <Switch
                        size='sm'
                        aria-label={mod.title}
                        checked={config[section.key]?.[mod.key] !== false}
                        onCheckedChange={(value) =>
                          toggleModule(section.key, mod.key, value)
                        }
                        disabled={!sectionEnabled}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        <div className='profile-sidebar-actions'>
          <Button variant='outline' onClick={handleReset}>
            {t('Reset to Default')}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? t('Saving...') : t('Save Changes')}
          </Button>
        </div>
      </div>
    </section>
  )
}
