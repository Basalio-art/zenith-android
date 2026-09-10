import style from './Navigator.module.css';
import { House, Settings, BookOpen, Download, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useContext, memo } from 'react';
import { AppContext } from './App.jsx';

const parentVariant = {
  hidden: {
    y: '100%',
    transition: {
      duration: 0.25
    }
  },
  visible: {
    y: 0,
    transition: {
      duration: 0.15,
      delayChildren: 0.1,
      staggerChildren: 0.25
    }
  },
  visibleNoStagger: {
    y: 0,
    transition: { duration: 0.15 }
  }
};

const childVariant = {
  hidden: {
    y: '200%'
  },
  visible: {
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  },
  visibleNoStagger: {
    y: 0
  }
};

const iconVariant = {
  normal: {
    scale: 1,
    opacity: 1
  },
  resize: {
    scale: 0.9,
    opacity: 0.7,
    transition: {
      delay: 2,
      duration: 1
    }
  }
};

const labelVariants = {
  hidden: {
    height: 0
  },
  show: {
    height: 'auto',
    transition: {
      delay: 2,
      duration: 1
    }
  }
};

function Navigator({ navigatorOpen, page }) {
  const { setPage, setNavigatorOpen } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState(page);
  const [introFinished, setIntroFinished] = useState(false);

  const closeViewer = page => {
    setPage(page);
  };

  const commonProps = {
    introFinished,
    activeTab,
    closeViewer,
    childVariant
  };

  useEffect(() => {
    const introTimeout = setTimeout(() => {
      setIntroFinished(true);
    }, 3000);
    return () => {
      clearTimeout(introTimeout);
    };
  }, []);

  useEffect(() => {
    setActiveTab(page);
  }, [page]);

  return (
    <AnimatePresence mode='popLayout'>
      {navigatorOpen && (
        <motion.section
          key='navigator'
          variants={parentVariant}
          initial='hidden'
          animate={introFinished ? 'visibleNoStagger' : 'visible'}
          exit='hidden'
          className={style.navigationSection}
        >
          <AnimatedIcon {...commonProps} icon=<House /> label='home' />
          <AnimatedIcon {...commonProps} icon=<Search /> label='search' />
          <AnimatedIcon {...commonProps} icon=<Download /> label='downloads' />
          <AnimatedIcon {...commonProps} icon=<BookOpen /> label='library' />
          <AnimatedIcon {...commonProps} icon=<Settings /> label='settings' />
        </motion.section>
      )}
    </AnimatePresence>
  );
}

const AnimatedIcon = ({
  childVariant,
  icon,
  label,
  introFinished,
  activeTab,
  closeViewer
}) => {
  return (
    <motion.div
      variants={childVariant}
      className={`${style[label]} ${introFinished && activeTab === label ? style.active : ''}`}
      onClick={() => {
        closeViewer(label);
      }}
    >
      <motion.div variants={iconVariant} initial='normal' animate='resize'>
        {icon}
      </motion.div>
      <motion.span variants={labelVariants} initial={introFinished ? false : 'hidden'} animate='show'>
        {label}
      </motion.span>
      {activeTab === label && (
        <motion.div
          initial={{
            x: introFinished ? 0 : '-100%',
            opacity: introFinished ? 1 : 0
          }}
          animate={{
            x: introFinished ? 0 : '-100%',
            opacity: introFinished ? 1 : 0,
            transition: {
              type: 'spring',
              stiffness: 300,
              damping: 20
            }
          }}
          layoutId='underline'
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={`${style.underline} ${!introFinished ? style.intro : ''}`}
        />
      )}
    </motion.div>
  );
};

export default memo(Navigator);
